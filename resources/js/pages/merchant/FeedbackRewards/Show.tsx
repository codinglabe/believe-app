import React, { useEffect } from 'react'
import { Head, Link, usePage, router } from '@inertiajs/react'
import { MerchantCard, MerchantCardContent, MerchantCardHeader, MerchantCardTitle } from '@/components/merchant-ui'
import { MerchantButton } from '@/components/merchant-ui'
import { MerchantDashboardLayout } from '@/components/merchant'
import { ArrowLeft, Rocket, StopCircle, Copy, Download } from 'lucide-react'
import { motion } from 'framer-motion'
import { showSuccessToast, showErrorToast } from '@/lib/toast'

interface InsightBreakdown { label: string; count: number; percentage: number }
interface Insight { question: string; type: string; total: number; breakdown: InsightBreakdown[] }
interface Campaign {
  id: number; uuid: string; title: string; type: string
  reward_per_response_brp: number; total_budget_brp: number
  spent_budget_brp: number; remaining_budget_brp: number
  max_responses: number; responses_count: number
  status: string; created_at: string
  questions: any[]
}
interface Response {
  id: number; supporter: { id: number; name: string; email: string }
  reward_brp: number; status: string; created_at: string
}
interface Props { campaign: Campaign; insights: Insight[]; recentResponses: Response[] }

const typeLabels: Record<string, string> = {
  quick_vote: 'Quick Vote', short_feedback: 'Short Feedback',
  standard_survey: 'Standard Survey', deep_feedback: 'Deep Feedback',
}
const statusColors: Record<string, string> = {
  draft: 'bg-gray-500/20 text-gray-300', active: 'bg-emerald-500/20 text-emerald-300',
  paused: 'bg-amber-500/20 text-amber-300', completed: 'bg-blue-500/20 text-blue-300',
}
const CHART_COLORS = ['#2563EB', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4']

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
          <span className="text-2xl font-extrabold text-white">{total}</span>
          <span className="text-xs text-gray-500">Total</span>
        </div>
      </div>
      <div className="space-y-1.5 flex-1">
        {breakdown.map((item, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <span className="w-2.5 h-2.5 rounded flex-shrink-0" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
            <span className="text-gray-300 flex-1 truncate">{item.label}</span>
            <span className="text-white font-bold">{item.count}</span>
            <span className="text-gray-500 w-10 text-right">{item.percentage}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function ShowCampaign({ campaign, insights, recentResponses }: Props) {
  const { props } = usePage<{ success?: string; error?: string }>()
  useEffect(() => {
    if (props.success) showSuccessToast(props.success)
    if (props.error) showErrorToast(props.error)
  }, [props.success, props.error])

  const shareUrl = `${window.location.origin}/feedback/${campaign.uuid}`
  const completionRate = campaign.max_responses > 0 ? Math.round((campaign.responses_count / campaign.max_responses) * 100) : 0

  const copyShareUrl = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl)
      } else {
        const input = document.createElement('input')
        input.value = shareUrl
        input.setAttribute('readonly', '')
        input.style.position = 'absolute'
        input.style.left = '-9999px'
        document.body.appendChild(input)
        input.select()
        document.execCommand('copy')
        document.body.removeChild(input)
      }

      showSuccessToast('Link copied!')
    } catch (error) {
      console.error('Copy link failed:', error)
      showErrorToast('Unable to copy link. Please copy it manually.')
    }
  }

  return (
    <>
      <Head title={`${campaign.title} - Feedback & Rewards`} />
      <MerchantDashboardLayout>
        <div className="w-full">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <Link href="/feedback-rewards" className="text-sm text-gray-400 hover:text-white flex items-center gap-1 mb-1">
                  <ArrowLeft className="h-3.5 w-3.5" />Back to Campaigns
                </Link>
                <div className="flex items-center flex-wrap gap-2">
                  <h1 className="text-2xl font-bold text-white">{campaign.title}</h1>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[campaign.status] || ''}`}>
                    {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
                  </span>
                </div>
                <p className="text-gray-400 text-sm">{typeLabels[campaign.type]}</p>
              </div>
              <div className="flex gap-2 flex-wrap">
                {campaign.status === 'draft' && (
                  <MerchantButton onClick={() => router.post(`/feedback-rewards/${campaign.id}/launch`)}
                    className="bg-gradient-to-r from-emerald-600 to-emerald-700">
                    <Rocket className="h-4 w-4 mr-1" />Launch Campaign
                  </MerchantButton>
                )}
                {campaign.status === 'active' && (
                  <>
                    <MerchantButton variant="outline" size="sm" onClick={copyShareUrl}>
                      <Copy className="h-4 w-4 mr-1" />Copy Link
                    </MerchantButton>
                    <MerchantButton variant="outline" size="sm"
                      className="border-red-500/40 text-red-400 hover:bg-red-500/10"
                      onClick={() => { if (confirm('End campaign? Unused BRP will be released.')) router.post(`/feedback-rewards/${campaign.id}/end`) }}>
                      <StopCircle className="h-4 w-4 mr-1" />End
                    </MerchantButton>
                  </>
                )}
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {/* Main: Insights */}
              <div className="md:col-span-2 space-y-4">
                <MerchantCard className="shadow-xl">
                  <MerchantCardHeader>
                    <div className="flex justify-between items-center">
                      <div>
                        <MerchantCardTitle className="text-white">{campaign.title}</MerchantCardTitle>
                        <p className="text-xs text-gray-400">{typeLabels[campaign.type]}</p>
                      </div>
                      <MerchantButton variant="outline" size="sm"><Download className="h-3.5 w-3.5 mr-1" />Export</MerchantButton>
                    </div>
                  </MerchantCardHeader>
                  <MerchantCardContent className="space-y-6">
                    {insights.length === 0 ? (
                      <p className="text-gray-500 text-sm text-center py-6">No responses yet. Share your campaign link to start collecting feedback.</p>
                    ) : insights.map((insight, qi) => (
                      <div key={qi} className="space-y-2">
                        <p className="text-sm text-white font-medium">{insight.question}</p>
                        <p className="text-xs text-gray-500">{insight.type.replace('_', ' ')} • {insight.total} responses</p>
                        {insight.total === 0 ? (
                          <p className="text-xs text-gray-600 italic">No responses yet</p>
                        ) : insight.type === 'multiple_choice' ? (
                          <DonutChart breakdown={insight.breakdown} total={insight.total} />
                        ) : (
                          <div className="space-y-2">
                            {insight.breakdown.map((item, bi) => (
                              <div key={bi} className="flex items-center gap-3">
                                <span className="text-sm text-gray-300 w-16">{item.label}</span>
                                <div className="flex-1 h-5 rounded-full bg-gray-800 overflow-hidden">
                                  <motion.div initial={{ width: 0 }} animate={{ width: `${item.percentage}%` }} transition={{ duration: 0.7, delay: bi * 0.1 }}
                                    className="h-full rounded-full" style={{ background: CHART_COLORS[bi] }} />
                                </div>
                                <span className="text-sm text-white font-medium w-12 text-right">{item.percentage}%</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </MerchantCardContent>
                </MerchantCard>

                {recentResponses.length > 0 && (
                  <MerchantCard className="shadow-xl">
                    <MerchantCardHeader><MerchantCardTitle className="text-white">Recent Responses</MerchantCardTitle></MerchantCardHeader>
                    <MerchantCardContent className="p-0">
                      <table className="w-full">
                        <thead><tr className="border-b border-gray-800">
                          {['Date', 'Supporter', 'BP Earned', 'Status'].map(h => (
                            <th key={h} className="text-left px-5 py-2.5 text-xs font-semibold text-gray-400 uppercase">{h}</th>
                          ))}
                        </tr></thead>
                        <tbody className="divide-y divide-gray-800/50">
                          {recentResponses.map((resp) => (
                            <tr key={resp.id} className="hover:bg-white/[0.02]">
                              <td className="px-5 py-3 text-sm text-gray-400">{new Date(resp.created_at).toLocaleDateString()}</td>
                              <td className="px-5 py-3 text-sm text-white">{resp.supporter?.name || 'Anonymous'}</td>
                              <td className="px-5 py-3 text-sm text-emerald-400 font-semibold">+{resp.reward_brp} BP</td>
                              <td className="px-5 py-3"><span className="px-2 py-0.5 rounded-full text-xs bg-emerald-500/15 text-emerald-300">{resp.status}</span></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </MerchantCardContent>
                  </MerchantCard>
                )}
              </div>

              {/* Sidebar */}
              <div className="space-y-4">
                <MerchantCard className="shadow-xl">
                  <MerchantCardContent className="p-5 space-y-3.5">
                    <div className="flex justify-between text-sm"><span className="text-gray-400">Responses</span><span className="text-white font-bold">{campaign.responses_count} / {campaign.max_responses}</span></div>
                    <div>
                      <div className="flex justify-between text-xs text-gray-500 mb-1"><span>Completion</span><span>{completionRate}%</span></div>
                      <div className="w-full h-2 rounded-full bg-gray-800"><motion.div initial={{ width: 0 }} animate={{ width: `${completionRate}%` }} transition={{ duration: 0.8 }} className="h-full rounded-full bg-gradient-to-r from-[#2563EB] to-emerald-500" /></div>
                    </div>
                    <div className="flex justify-between text-sm"><span className="text-gray-400">BRP Spent</span><span className="text-white font-bold">{campaign.spent_budget_brp.toLocaleString()}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-gray-400">Remaining</span><span className="text-emerald-400 font-bold">{campaign.remaining_budget_brp.toLocaleString()}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-gray-400">Reward/Response</span><span className="text-white font-bold">{campaign.reward_per_response_brp} BP</span></div>
                    <div className="flex justify-between text-sm"><span className="text-gray-400">Status</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs ${statusColors[campaign.status] || ''}`}>{campaign.status}</span>
                    </div>
                  </MerchantCardContent>
                </MerchantCard>

                {campaign.status === 'active' && (
                  <div className="p-4 rounded-xl bg-[#2563EB]/10 border border-[#2563EB]/20 space-y-2">
                    <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">Share Link</p>
                    <p className="text-xs text-[#2563EB] break-all">{shareUrl}</p>
                    <MerchantButton variant="ghost" size="sm" className="w-full text-xs" onClick={copyShareUrl}>
                      <Copy className="h-3 w-3 mr-1" />Copy
                    </MerchantButton>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </MerchantDashboardLayout>
    </>
  )
}

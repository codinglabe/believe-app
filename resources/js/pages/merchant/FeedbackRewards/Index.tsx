import React, { useEffect } from 'react'
import { Head, Link, usePage, router } from '@inertiajs/react'
import { MerchantCard, MerchantCardContent, MerchantCardHeader, MerchantCardTitle } from '@/components/merchant-ui'
import { MerchantButton } from '@/components/merchant-ui'
import { MerchantDashboardLayout } from '@/components/merchant'
import { Plus, MessageSquare, Wallet, Eye, Users, DollarSign, Activity, ArrowRight, Search } from 'lucide-react'
import { motion } from 'framer-motion'
import { showSuccessToast, showErrorToast } from '@/lib/toast'

interface Campaign {
  id: number
  uuid: string
  title: string
  type: string
  reward_per_response_brp: number
  total_budget_brp: number
  remaining_budget_brp: number
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
  campaigns: {
    data: Campaign[]
    links: any[]
    current_page: number
    last_page: number
  }
  wallet: WalletInfo
  filters: {
    search: string
    status: string
  }
}

const typeLabels: Record<string, string> = {
  quick_vote: 'Quick Vote',
  short_feedback: 'Short Feedback',
  standard_survey: 'Standard Survey',
  deep_feedback: 'Deep Feedback',
}

const statusColors: Record<string, { bg: string; text: string; dot: string }> = {
  draft: { bg: 'bg-gray-500/15', text: 'text-gray-300', dot: 'bg-gray-400' },
  active: { bg: 'bg-emerald-500/15', text: 'text-emerald-300', dot: 'bg-emerald-400' },
  paused: { bg: 'bg-amber-500/15', text: 'text-amber-300', dot: 'bg-amber-400' },
  completed: { bg: 'bg-blue-500/15', text: 'text-blue-300', dot: 'bg-blue-400' },
  cancelled: { bg: 'bg-red-500/15', text: 'text-red-300', dot: 'bg-red-400' },
}

export default function FeedbackRewardsIndex({ campaigns, wallet, filters }: Props) {
  const { props } = usePage<{ success?: string; error?: string }>()

  useEffect(() => {
    if (props.success) showSuccessToast(props.success)
    if (props.error) showErrorToast(props.error)
  }, [props.success, props.error])

  const activeCampaigns = campaigns.data.filter((c) => c.status === 'active').length

  return (
    <>
      <Head title="Feedback & Rewards - Merchant Dashboard" />
      <MerchantDashboardLayout>
        <div className="w-full">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-white mb-1">Feedback & Rewards</h1>
                <p className="text-gray-400">Collect feedback and let supporters earn BP</p>
              </div>
              <Link href="/feedback-rewards/create">
                <MerchantButton className="bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] hover:from-[#FF1FA3] hover:via-[#EC1F4C] hover:to-[#F98461]">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Campaign
                </MerchantButton>
              </Link>
            </div>

            {/* Stats Cards Row — matches reference screen 1 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Active Campaigns', value: activeCampaigns, icon: Activity, color: 'text-[#2563EB]', bg: 'bg-[#2563EB]/10' },
                { label: 'Total Responses', value: campaigns.data.reduce((s, c) => s + c.responses_count, 0), icon: Users, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
                { label: 'BRP Spent', value: wallet.spent_brp.toLocaleString(), sub: `$${(wallet.spent_brp * 0.01).toFixed(2)}`, icon: DollarSign, color: 'text-amber-400', bg: 'bg-amber-400/10' },
                { label: 'BRP Balance', value: wallet.balance_brp.toLocaleString(), sub: `$${(wallet.balance_brp * 0.01).toFixed(2)}`, icon: Wallet, color: 'text-white', bg: 'bg-white/10' },
              ].map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                >
                  <MerchantCard className="shadow-lg hover:shadow-xl transition-shadow">
                    <MerchantCardContent className="p-5">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">{stat.label}</p>
                          <p className={`text-2xl font-extrabold ${stat.color}`}>{stat.value}</p>
                          {stat.sub && <p className="text-xs text-gray-500 mt-0.5">{stat.sub}</p>}
                        </div>
                        <div className={`p-2.5 rounded-xl ${stat.bg}`}>
                          <stat.icon className={`h-5 w-5 ${stat.color}`} />
                        </div>
                      </div>
                    </MerchantCardContent>
                  </MerchantCard>
                </motion.div>
              ))}
            </div>

            {/* Filter Tabs — matches reference screen 6 */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <div className="flex gap-1 p-1 rounded-xl bg-gray-900/60 border border-gray-800">
                {['', 'active', 'completed', 'paused', 'draft'].map((s) => {
                  const label = s === '' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)
                  const isSelected = filters.status === s
                  return (
                    <button
                      key={s}
                      onClick={() => router.get('/feedback-rewards', { search: filters.search, status: s }, { preserveState: true, replace: true })}
                      className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                        isSelected
                          ? 'bg-[#2563EB] text-white shadow-sm'
                          : 'text-gray-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                <input
                  type="text"
                  placeholder="Search campaigns..."
                  defaultValue={filters.search}
                  onChange={(e) => router.get('/feedback-rewards', { search: e.target.value, status: filters.status }, { preserveState: true, replace: true })}
                  className="w-full pl-9 pr-4 py-2 rounded-lg bg-gray-900/50 border border-gray-700/50 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-[#2563EB]/60"
                />
              </div>
            </div>

            {/* Campaigns Table — matches reference screen 6 */}
            <MerchantCard className="shadow-xl overflow-hidden">
              <MerchantCardHeader className="pb-0">
                <MerchantCardTitle className="text-white">Campaigns</MerchantCardTitle>
              </MerchantCardHeader>
              <MerchantCardContent className="p-0">
                {campaigns.data.length === 0 ? (
                  <div className="text-center py-16 px-6">
                    <MessageSquare className="h-14 w-14 text-gray-600 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-white mb-2">No campaigns yet</h3>
                    <p className="text-gray-400 mb-6">Create your first feedback campaign to start collecting insights</p>
                    <Link href="/feedback-rewards/create">
                      <MerchantButton className="bg-gradient-to-r from-[#2563EB] to-[#1D4ED8]">
                        <Plus className="h-4 w-4 mr-2" />
                        Create Campaign
                      </MerchantButton>
                    </Link>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-800">
                          <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Campaign</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Type</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Reward</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Budget</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Responses</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">End Date</th>
                          <th className="text-right px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-800/50">
                        {campaigns.data.map((campaign, index) => {
                          const sc = statusColors[campaign.status] || statusColors.draft
                          return (
                            <motion.tr
                              key={campaign.id}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ delay: index * 0.03 }}
                              className="hover:bg-white/[0.02] transition-colors"
                            >
                              <td className="px-6 py-4">
                                <p className="text-sm font-medium text-white truncate max-w-[200px]">{campaign.title}</p>
                              </td>
                              <td className="px-4 py-4">
                                <span className="text-sm text-gray-400">{typeLabels[campaign.type] || campaign.type}</span>
                              </td>
                              <td className="px-4 py-4">
                                <span className="text-sm text-white font-medium">{campaign.reward_per_response_brp} BP</span>
                              </td>
                              <td className="px-4 py-4">
                                <span className="text-sm text-gray-300">{campaign.remaining_budget_brp.toLocaleString()} / {campaign.total_budget_brp.toLocaleString()}</span>
                              </td>
                              <td className="px-4 py-4">
                                <span className="text-sm text-white">{campaign.responses_count} / {campaign.max_responses}</span>
                              </td>
                              <td className="px-4 py-4">
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${sc.bg} ${sc.text}`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                                  {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
                                </span>
                              </td>
                              <td className="px-4 py-4">
                                <span className="text-sm text-gray-500">{new Date(campaign.created_at).toLocaleDateString()}</span>
                              </td>
                              <td className="px-6 py-4 text-right">
                                <Link href={`/feedback-rewards/${campaign.id}`}>
                                  <MerchantButton variant="ghost" size="sm" className="text-[#2563EB] hover:text-white">
                                    <Eye className="h-4 w-4" />
                                  </MerchantButton>
                                </Link>
                              </td>
                            </motion.tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </MerchantCardContent>
            </MerchantCard>

            {/* Pagination */}
            {campaigns.last_page > 1 && (
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">
                  Showing {campaigns.data.length} of {campaigns.data.length} campaigns
                </p>
                <div className="flex gap-1">
                  {campaigns.links?.map((link: any, i: number) => (
                    <button
                      key={i}
                      disabled={!link.url}
                      onClick={() => link.url && router.get(link.url)}
                      className={`px-3 py-1.5 rounded text-sm ${
                        link.active ? 'bg-[#2563EB] text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                      } ${!link.url ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                      dangerouslySetInnerHTML={{ __html: link.label }}
                    />
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </MerchantDashboardLayout>
    </>
  )
}

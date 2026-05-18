import React, { useEffect } from 'react'
import { Head, Link, usePage } from '@inertiajs/react'
import { MerchantDashboardLayout } from '@/components/merchant'
import { MerchantButton } from '@/components/merchant-ui'
import { MerchantCard, MerchantCardContent, MerchantCardHeader, MerchantCardTitle } from '@/components/merchant-ui'
import { Plus, Megaphone } from 'lucide-react'
import { motion } from 'framer-motion'
import { showErrorToast, showSuccessToast } from '@/lib/toast'

interface CampaignRow {
  id: number
  name: string | null
  fund_amount_usd: number
  merchant_brp_amount: number
  status: string
  award_triggers: string[]
  created_at: string | null
}

interface Props {
  campaigns: CampaignRow[]
  wallet: { available_merchant_brp: number }
}

function StatusBadge({ status }: { status: string }) {
  const styles =
    status === 'active'
      ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'
      : status === 'pending_payment'
        ? 'bg-amber-500/15 text-amber-200 border-amber-500/40'
        : 'bg-white/10 text-gray-300 border-white/20'

  return (
    <span className={`inline-flex px-2 py-0.5 rounded-md text-xs font-semibold border capitalize ${styles}`}>{status.replace('_', ' ')}</span>
  )
}

export default function BrpCampaignIndex({ campaigns, wallet }: Props) {
  const { props } = usePage<{ success?: string; error?: string }>()
  useEffect(() => {
    if (props.success) showSuccessToast(props.success)
    if (props.error) showErrorToast(props.error)
  }, [props.success, props.error])

  return (
    <>
      <Head title="BRP Campaigns — BIU Merchant Hub" />
      <MerchantDashboardLayout>
        <div className="w-full max-w-5xl mx-auto space-y-6">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-white">BRP campaigns</h1>
              <p className="text-gray-400 mt-1">
                Campaigns you fund with USD become Merchant BRP for your triggers. Balance:{' '}
                <span className="text-violet-300 font-semibold">{wallet.available_merchant_brp.toLocaleString()} BRP</span>.
              </p>
            </div>
            <Link href="/brp-funding">
              <MerchantButton className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white border-0">
                <Plus className="w-4 h-4 mr-2" />
                Fund new campaign
              </MerchantButton>
            </Link>
          </motion.div>

          <MerchantCard className="border border-white/10">
            <MerchantCardHeader className="flex flex-row items-center gap-2">
              <Megaphone className="w-5 h-5 text-violet-400" />
              <MerchantCardTitle className="text-white">Your campaigns</MerchantCardTitle>
            </MerchantCardHeader>
            <MerchantCardContent className="overflow-x-auto">
              {campaigns.length === 0 ? (
                <p className="text-gray-400 text-sm py-8 text-center">
                  No campaigns yet.{' '}
                  <Link href="/brp-funding" className="text-violet-400 hover:text-violet-300 font-medium">
                    Fund your first BRP campaign
                  </Link>
                  .
                </p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-left text-gray-500">
                      <th className="pb-3 pr-4 font-medium">Campaign</th>
                      <th className="pb-3 pr-4 font-medium">Fund (USD)</th>
                      <th className="pb-3 pr-4 font-medium">Merchant BRP</th>
                      <th className="pb-3 pr-4 font-medium">Triggers</th>
                      <th className="pb-3 pr-4 font-medium">Status</th>
                      <th className="pb-3 font-medium">Created</th>
                    </tr>
                  </thead>
                  <tbody className="text-gray-200">
                    {campaigns.map((c) => (
                      <tr key={c.id} className="border-b border-white/5">
                        <td className="py-3 pr-4 font-medium text-white">{c.name || `Campaign #${c.id}`}</td>
                        <td className="py-3 pr-4">${c.fund_amount_usd.toFixed(2)}</td>
                        <td className="py-3 pr-4 text-violet-300">{c.merchant_brp_amount.toLocaleString()} BRP</td>
                        <td className="py-3 pr-4 text-gray-400 max-w-[200px] truncate" title={c.award_triggers.join(', ')}>
                          {c.award_triggers.length ? c.award_triggers.join(', ') : '—'}
                        </td>
                        <td className="py-3 pr-4">
                          <StatusBadge status={c.status} />
                        </td>
                        <td className="py-3 text-gray-500 whitespace-nowrap">
                          {c.created_at ? new Date(c.created_at).toLocaleString() : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </MerchantCardContent>
          </MerchantCard>
        </div>
      </MerchantDashboardLayout>
    </>
  )
}

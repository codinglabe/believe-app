import React, { useEffect } from 'react'
import { Head, Link, usePage, router } from '@inertiajs/react'
import { MerchantCard, MerchantCardContent, MerchantCardHeader, MerchantCardTitle } from '@/components/merchant-ui'
import { MerchantButton } from '@/components/merchant-ui'
import { MerchantDashboardLayout } from '@/components/merchant'
import { ShoppingCart, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { motion } from 'framer-motion'
import { showSuccessToast, showErrorToast } from '@/lib/toast'

interface WalletInfo {
  balance_brp: number; reserved_brp: number; spent_brp: number
  available_brp: number; balance_dollars: number; available_dollars: number
  reserved_dollars: number
  /** Lifetime BP/USD to supporters; raw spent_brp in DB is US-cent sum */
  sent_bp: number; sent_dollars: number
}
interface Transaction {
  id: number; type: string; amount_brp: number; description: string; created_at: string
  amount_bp_display: number; amount_dollars: number
}
interface Props {
  wallet: WalletInfo
  transactions: { data: Transaction[]; links: any[]; current_page: number; last_page: number }
}

const typeConfig: Record<string, { icon: React.ElementType; color: string; positive: boolean }> = {
  purchase: { icon: ArrowUpRight, color: 'text-emerald-400', positive: true },
  release:  { icon: ArrowUpRight, color: 'text-blue-400',   positive: true },
  reserve:  { icon: ArrowDownRight, color: 'text-amber-400', positive: false },
  payout:   { icon: ArrowDownRight, color: 'text-red-400',   positive: false },
}

export default function BrpWalletIndex({ wallet, transactions }: Props) {
  const { props } = usePage<{ success?: string; error?: string }>()
  useEffect(() => {
    if (props.success) showSuccessToast(props.success)
    if (props.error) showErrorToast(props.error)
  }, [props.success, props.error])

  return (
    <>
      <Head title="Rewards Wallet (BP)" />
      <MerchantDashboardLayout>
        <div className="w-full">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-white mb-1">Rewards Wallet</h1>
                <p className="text-gray-400">Manage your BP balance and view transactions. 1 BP = $1.00.</p>
              </div>
              <Link href="/wallet/brp/buy">
                <MerchantButton className="bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] hover:from-emerald-600 hover:to-emerald-700">
                  <ShoppingCart className="h-4 w-4 mr-2" />Buy BP
                </MerchantButton>
              </Link>
            </div>

            {/* Main Balance + Summary — matches reference screen 8 */}
            <div className="grid md:grid-cols-3 gap-6">
              {/* Big balance card */}
              <div className="md:col-span-2">
                <MerchantCard className="shadow-xl border border-[#2563EB]/20 h-full">
                  <MerchantCardContent className="p-6 flex flex-col justify-between h-full">
                    <p className="text-sm text-gray-400 uppercase tracking-wide font-semibold mb-2">Available balance</p>
                    <p className="text-6xl font-extrabold text-white mb-1">{Number(wallet.available_brp).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}<span className="text-2xl font-normal text-gray-400 ml-2">BP</span></p>
                    <p className="text-lg text-gray-400 mb-6">= ${wallet.available_dollars.toFixed(2)}</p>
                    <Link href="/wallet/brp/buy">
                      <MerchantButton className="bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] w-full sm:w-auto">
                        <ShoppingCart className="h-4 w-4 mr-2" />Buy BP
                      </MerchantButton>
                    </Link>
                  </MerchantCardContent>
                </MerchantCard>
              </div>

              {/* Balance Summary */}
              <MerchantCard className="shadow-xl">
                <MerchantCardHeader><MerchantCardTitle className="text-white">Balance Summary</MerchantCardTitle></MerchantCardHeader>
                <MerchantCardContent className="space-y-3">
                  {[
                    { label: 'Total balance', value: Number(wallet.balance_brp).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 }), sub: `$${wallet.balance_dollars.toFixed(2)}`, color: 'text-white' },
                    { label: 'Reserved', value: Number(wallet.reserved_brp).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 }), sub: `$${wallet.reserved_dollars.toFixed(2)}`, color: 'text-amber-400' },
                    { label: 'BP sent', value: Number(wallet.sent_bp).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 }), sub: `= $${wallet.sent_dollars.toFixed(2)}`, color: 'text-red-400' },
                    { label: 'Expired', value: '0', sub: '$0.00', color: 'text-gray-500' },
                    { label: 'Available', value: Number(wallet.available_brp).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 }), sub: `$${wallet.available_dollars.toFixed(2)}`, color: 'text-emerald-400' },
                  ].map((item) => (
                    <div key={item.label} className="flex justify-between items-center py-1.5 border-b border-gray-800/60 last:border-0">
                      <span className="text-sm text-gray-400">{item.label}</span>
                      <div className="text-right">
                        <p className={`text-sm font-bold ${item.color}`}>{item.value} BP</p>
                        <p className="text-xs text-gray-600">{item.sub}</p>
                      </div>
                    </div>
                  ))}
                </MerchantCardContent>
              </MerchantCard>
            </div>

            {/* Transactions Table — reference screen 8 */}
            <MerchantCard className="shadow-xl">
              <MerchantCardHeader>
                <div className="flex justify-between items-center">
                  <MerchantCardTitle className="text-white">Recent Transactions</MerchantCardTitle>
                  {transactions.last_page > 1 && (
                    <div className="flex gap-1">
                      {transactions.links?.map((link: any, i: number) => (
                        <button key={i} disabled={!link.url} onClick={() => link.url && router.get(link.url)}
                          className={`px-2.5 py-1 rounded text-xs ${link.active ? 'bg-[#2563EB] text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'} ${!link.url ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                          aria-label={String(link.label).replace(/<[^>]*>/g, '').trim() || 'Pagination'}
                          title={String(link.label).replace(/<[^>]*>/g, '').trim() || 'Pagination'}
                          dangerouslySetInnerHTML={{ __html: link.label }} />
                      ))}
                    </div>
                  )}
                </div>
              </MerchantCardHeader>
              <MerchantCardContent className="p-0">
                {transactions.data.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-gray-400">No transactions yet. Buy BP to get started!</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead><tr className="border-b border-gray-800">
                        {['Date', 'Type', 'Description', 'Amount'].map((h) => (
                          <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">{h}</th>
                        ))}
                      </tr></thead>
                      <tbody className="divide-y divide-gray-800/50">
                        {transactions.data.map((tx, i) => {
                          const cfg = typeConfig[tx.type] || typeConfig.payout
                          const bpDisplay = tx.amount_bp_display ?? tx.amount_brp
                          const usd = tx.amount_dollars ?? bpDisplay
                          return (
                            <motion.tr key={tx.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                              className="hover:bg-white/[0.02]">
                              <td className="px-5 py-3 text-sm text-gray-400">{new Date(tx.created_at).toLocaleDateString()}</td>
                              <td className="px-5 py-3">
                                <div className="flex items-center gap-1.5">
                                  <cfg.icon className={`h-3.5 w-3.5 ${cfg.color}`} />
                                  <span className={`text-xs font-semibold capitalize ${cfg.color}`}>{tx.type}</span>
                                </div>
                              </td>
                              <td className="px-5 py-3 text-sm text-gray-300 max-w-[200px] truncate">{tx.description}</td>
                              <td className="px-5 py-3 text-sm font-bold">
                                <span className={cfg.positive ? 'text-emerald-400' : 'text-red-400'}>
                                  {cfg.positive ? '+' : '-'}{Number(bpDisplay).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })} BP
                                </span>
                                <span className="block text-xs font-normal text-gray-500">${usd.toFixed(2)}</span>
                              </td>
                            </motion.tr>
                          )
                        })}
                      </tbody>
                    </table>
                    {transactions.data.length > 0 && (
                      <div className="px-5 py-3 border-t border-gray-800">
                        <Link href="/wallet/brp" className="text-xs text-[#2563EB] hover:underline">View All Transactions →</Link>
                      </div>
                    )}
                  </div>
                )}
              </MerchantCardContent>
            </MerchantCard>

          </motion.div>
        </div>
      </MerchantDashboardLayout>
    </>
  )
}

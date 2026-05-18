import React, { useEffect } from 'react'
import { Head, Link, usePage, router } from '@inertiajs/react'
import AppLayout from '@/layouts/app-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ShoppingCart, ArrowUpRight, ArrowDownRight, Wallet } from 'lucide-react'
import { showSuccessToast, showErrorToast } from '@/lib/toast'

interface WalletInfo {
  balance_brp: number; reserved_brp: number; spent_brp: number
  available_brp: number; balance_dollars: number; available_dollars: number
}
interface Transaction {
  id: number; type: string; amount_brp: number; description: string; created_at: string
}
interface Props {
  wallet: WalletInfo
  transactions: { data: Transaction[]; links: any[]; current_page: number; last_page: number }
  organization: { id: number; name: string }
}

const typeConfig: Record<string, { icon: React.ElementType; color: string; positive: boolean }> = {
  purchase: { icon: ArrowUpRight,   color: 'text-emerald-500', positive: true },
  release:  { icon: ArrowUpRight,   color: 'text-blue-500',    positive: true },
  reserve:  { icon: ArrowDownRight, color: 'text-amber-500',   positive: false },
  payout:   { icon: ArrowDownRight, color: 'text-red-500',     positive: false },
}

export default function OrgBrpWalletIndex({ wallet, transactions, organization }: Props) {
  const { props } = usePage<{ success?: string; error?: string }>()
  useEffect(() => {
    if (props.success) showSuccessToast(props.success)
    if (props.error) showErrorToast(props.error)
  }, [props.success, props.error])

  return (
    <AppLayout>
      <Head title="Rewards Wallet (BRP)" />
      <div className="container mx-auto py-8 px-4 max-w-6xl space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-1">Rewards Wallet</h1>
            <p className="text-muted-foreground">{organization.name} — Manage your BRP balance and view transactions</p>
          </div>
          <Link href="/believe-points">
            <Button className="bg-gradient-to-r from-[#FF1493] to-[#DC143C] hover:from-[#FF1493]/90 hover:to-[#DC143C]/90">
              <ShoppingCart className="h-4 w-4 mr-2" />Buy BRP
            </Button>
          </Link>
        </div>

        {/* Balance Cards */}
        <div className="grid md:grid-cols-3 gap-6">
          {/* Big balance */}
          <div className="md:col-span-2">
            <Card className="border-[#FF1493]/20 h-full">
              <CardContent className="p-6 flex flex-col justify-between h-full">
                <div>
                  <p className="text-sm text-muted-foreground uppercase tracking-wide font-semibold mb-2">Current Balance</p>
                  <p className="text-6xl font-extrabold mb-1">
                    {wallet.balance_brp.toLocaleString()}
                    <span className="text-2xl font-normal text-muted-foreground ml-2">BRP</span>
                  </p>
                  <p className="text-lg text-muted-foreground mb-6">≈ ${wallet.balance_dollars.toFixed(2)}</p>
                </div>
                <Link href="/believe-points">
                  <Button className="bg-gradient-to-r from-[#FF1493] to-[#DC143C] w-full sm:w-auto">
                    <ShoppingCart className="h-4 w-4 mr-2" />Buy BRP
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>

          {/* Balance Summary */}
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Wallet className="h-4 w-4" />Balance Summary</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {[
                { label: 'Total Balance',     value: wallet.balance_brp.toLocaleString(),   sub: `$${wallet.balance_dollars.toFixed(2)}`,          color: 'text-foreground' },
                { label: 'Reserved',          value: wallet.reserved_brp.toLocaleString(),  sub: `$${(wallet.reserved_brp * 0.01).toFixed(2)}`,    color: 'text-amber-500' },
                { label: 'Total Spent',       value: wallet.spent_brp.toLocaleString(),     sub: `$${(wallet.spent_brp * 0.01).toFixed(2)}`,       color: 'text-red-500' },
                { label: 'Available Balance', value: wallet.available_brp.toLocaleString(), sub: `$${wallet.available_dollars.toFixed(2)}`,         color: 'text-emerald-500' },
              ].map((item) => (
                <div key={item.label} className="flex justify-between items-center py-1.5 border-b last:border-0">
                  <span className="text-sm text-muted-foreground">{item.label}</span>
                  <div className="text-right">
                    <p className={`text-sm font-bold ${item.color}`}>{item.value} BRP</p>
                    <p className="text-xs text-muted-foreground">{item.sub}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Transactions */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Transaction History</CardTitle>
              {transactions.last_page > 1 && (
                <div className="flex gap-1">
                  {transactions.links?.map((link: any, i: number) => (
                    <button key={i} disabled={!link.url} onClick={() => link.url && router.get(link.url)}
                      className={`px-2.5 py-1 rounded text-xs ${link.active ? 'bg-[#FF1493] text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80'} ${!link.url ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                      dangerouslySetInnerHTML={{ __html: link.label }} />
                  ))}
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {transactions.data.length === 0 ? (
              <div className="text-center py-12">
                <ShoppingCart className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-40" />
                <p className="text-muted-foreground">No transactions yet.</p>
                <Link href="/believe-points">
                  <Button className="mt-4 bg-gradient-to-r from-[#FF1493] to-[#DC143C]">
                    Buy BRP to get started
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      {['Date', 'Type', 'Description', 'Amount'].map((h) => (
                        <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {transactions.data.map((tx) => {
                      const cfg = typeConfig[tx.type] || typeConfig.payout
                      return (
                        <tr key={tx.id} className="hover:bg-muted/30 transition-colors">
                          <td className="px-5 py-3 text-sm text-muted-foreground">{new Date(tx.created_at).toLocaleDateString()}</td>
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-1.5">
                              <cfg.icon className={`h-3.5 w-3.5 ${cfg.color}`} />
                              <span className={`text-xs font-semibold capitalize ${cfg.color}`}>{tx.type}</span>
                            </div>
                          </td>
                          <td className="px-5 py-3 text-sm text-muted-foreground max-w-[220px] truncate">{tx.description}</td>
                          <td className="px-5 py-3 text-sm font-bold">
                            <span className={cfg.positive ? 'text-emerald-500' : 'text-red-500'}>
                              {cfg.positive ? '+' : '-'}{tx.amount_brp.toLocaleString()} BRP
                            </span>
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
      </div>
    </AppLayout>
  )
}

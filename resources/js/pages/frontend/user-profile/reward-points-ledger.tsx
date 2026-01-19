"use client"

import React from "react"
import { Head, Link, router } from "@inertiajs/react"
import ProfileLayout from "@/components/frontend/layout/user-profile-layout"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/frontend/ui/card"
import { Badge } from "@/components/frontend/ui/badge"
import { 
  Activity, 
  Calendar, 
  TrendingUp,
  TrendingDown,
  Gift,
  ShoppingBag,
} from "lucide-react"

interface LedgerEntry {
  id: number
  source: string
  type: 'credit' | 'debit'
  points: number
  description: string | null
  metadata: Record<string, any> | null
  created_at: string
}

interface PaginationLink {
  url: string | null
  label: string
  active: boolean
}

interface PaginationData {
  current_page: number
  last_page: number
  per_page: number
  total: number
  from?: number
  to?: number
  links: PaginationLink[]
}

interface PageProps {
  ledgerEntries: {
    data: LedgerEntry[]
  } & PaginationData
  currentBalance: number
  filters: {
    per_page: number
    page: number
  }
}

export default function RewardPointsLedger({ 
  ledgerEntries, 
  currentBalance,
  filters 
}: PageProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getSourceLabel = (source: string) => {
    const labels: Record<string, string> = {
      'nonprofit_assessment': 'Volunteer Assessment',
      'merchant_reward_redemption': 'Merchant Reward Redemption',
    }
    return labels[source] || source.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
  }

  const handlePageChange = (page: number) => {
    if (page < 1 || page > ledgerEntries.last_page) return
    router.get('/profile/reward-points-ledger', {
      ...filters,
      page: page,
    }, {
      preserveState: true,
      preserveScroll: true,
    })
  }

  return (
    <ProfileLayout
      title="Reward Points"
      description="View your reward points transaction history"
    >
      <Head title="Reward Points" />
      <div className="space-y-6">
        {/* Current Balance Card */}
        <Card className="border border-gray-200 dark:border-gray-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Current Balance</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Gift className="h-8 w-8 text-amber-500" />
                  {currentBalance.toLocaleString()} Points
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Ledger Entries */}
        <Card className="border border-gray-200 dark:border-gray-800">
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">Transaction History</CardTitle>
            <CardDescription>All reward points credits and debits</CardDescription>
          </CardHeader>
          <CardContent>
            {ledgerEntries.data && ledgerEntries.data.length > 0 ? (
              <div className="space-y-4">
                {ledgerEntries.data.map((entry) => (
                  <div 
                    key={entry.id} 
                    className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1">
                        <div className={`p-2 rounded-lg ${
                          entry.type === 'credit' 
                            ? 'bg-green-100 dark:bg-green-900/20' 
                            : 'bg-red-100 dark:bg-red-900/20'
                        }`}>
                          {entry.type === 'credit' ? (
                            <TrendingUp className={`h-5 w-5 ${
                              entry.type === 'credit' 
                                ? 'text-green-600 dark:text-green-400' 
                                : 'text-red-600 dark:text-red-400'
                            }`} />
                          ) : (
                            <TrendingDown className="h-5 w-5 text-red-600 dark:text-red-400" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge className={
                              entry.type === 'credit'
                                ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800'
                                : 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800'
                            }>
                              {entry.type === 'credit' ? 'Credit' : 'Debit'}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {getSourceLabel(entry.source)}
                            </Badge>
                          </div>
                          <p className={`text-lg font-semibold ${
                            entry.type === 'credit'
                              ? 'text-green-700 dark:text-green-400'
                              : 'text-red-700 dark:text-red-400'
                          }`}>
                            {entry.type === 'credit' ? '+' : '-'}{entry.points.toLocaleString()} Points
                          </p>
                          {entry.description && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                              {entry.description}
                            </p>
                          )}
                          {entry.metadata && Object.keys(entry.metadata).length > 0 && (
                            <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                              {entry.metadata.grade && (
                                <span>Grade: {entry.metadata.grade} </span>
                              )}
                              {entry.metadata.base_points && (
                                <span>Base: {entry.metadata.base_points} pts </span>
                              )}
                              {entry.metadata.multiplier && (
                                <span>Multiplier: {Math.round(entry.metadata.multiplier * 100)}%</span>
                              )}
                            </div>
                          )}
                          <div className="flex items-center gap-2 mt-2 text-xs text-gray-500 dark:text-gray-400">
                            <Calendar className="h-3 w-3" />
                            <span>{formatDate(entry.created_at)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  No Transactions Yet
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Your reward points transaction history will appear here.
                </p>
              </div>
            )}

            {/* Pagination */}
            {ledgerEntries.last_page > 1 && (
              <div className="mt-6 flex items-center justify-between border-t border-gray-200 dark:border-gray-700 pt-4">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Showing <span className="font-medium">{ledgerEntries.from || 0}</span> to{" "}
                  <span className="font-medium">{ledgerEntries.to || 0}</span> of{" "}
                  <span className="font-medium">{ledgerEntries.total}</span> entries
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handlePageChange(ledgerEntries.current_page - 1)}
                    disabled={ledgerEntries.current_page === 1}
                    className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Page {ledgerEntries.current_page} of {ledgerEntries.last_page}
                  </span>
                  <button
                    onClick={() => handlePageChange(ledgerEntries.current_page + 1)}
                    disabled={ledgerEntries.current_page === ledgerEntries.last_page}
                    className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </ProfileLayout>
  )
}

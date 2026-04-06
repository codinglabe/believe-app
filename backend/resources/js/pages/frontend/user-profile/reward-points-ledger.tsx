"use client"

import React, { useState } from "react"
import { Head, router } from "@inertiajs/react"
import ProfileLayout from "@/components/frontend/layout/user-profile-layout"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/frontend/ui/card"
import { Badge } from "@/components/frontend/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/frontend/ui/table"
import { 
  Gift,
  TrendingUp,
  TrendingDown,
  Calendar,
  ChevronDown,
  ChevronUp,
  Info,
  Sparkles,
} from "lucide-react"
import { cn } from "@/lib/utils"

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
  summary: {
    total_credits: number
    total_debits: number
    net_points: number
  }
  filters: {
    per_page: number
    page: number
  }
}

export default function RewardPointsLedger({ 
  ledgerEntries, 
  currentBalance,
  summary,
  filters 
}: PageProps) {
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set())

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatDateShort = (dateString: string) => {
    const date = new Date(dateString)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (date.toDateString() === today.toDateString()) {
      return `Today, ${date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`
    } else if (date.toDateString() === yesterday.toDateString()) {
      return `Yesterday, ${date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
      })
    }
  }

  const getSourceLabel = (source: string) => {
    const labels: Record<string, string> = {
      'nonprofit_assessment': 'Volunteer Assessment',
      'merchant_reward_redemption': 'Merchant Redemption',
      'merchant_hub_redemption': 'Merchant Hub Redemption',
      'merchant_hub_redemption_refund': 'Redemption Refund',
    }
    return labels[source] || source.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
  }

  const toggleRowExpansion = (entryId: number) => {
    const newExpanded = new Set(expandedRows)
    if (newExpanded.has(entryId)) {
      newExpanded.delete(entryId)
    } else {
      newExpanded.add(entryId)
    }
    setExpandedRows(newExpanded)
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
        {/* Hero Balance Card */}
        <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100 dark:from-amber-950/20 dark:via-orange-950/20 dark:to-amber-900/20">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-400/10 to-orange-400/10 dark:from-amber-500/5 dark:to-orange-500/5" />
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-amber-300/20 to-orange-300/20 rounded-full -mr-32 -mt-32 blur-3xl" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-orange-300/20 to-amber-300/20 rounded-full -ml-24 -mb-24 blur-3xl" />
          <CardContent className="relative p-8">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-3 rounded-xl bg-amber-500/10 dark:bg-amber-500/20 backdrop-blur-sm">
                    <Gift className="h-8 w-8 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-amber-700 dark:text-amber-300 mb-1">
                      Current Balance
                    </p>
                    <p className="text-4xl font-bold text-amber-900 dark:text-amber-100">
                      {currentBalance.toLocaleString()}
                      <span className="text-xl text-amber-700 dark:text-amber-300 ml-2">Points</span>
                    </p>
                  </div>
                </div>
              </div>
              <div className="hidden md:block">
                <Sparkles className="h-16 w-16 text-amber-400/30 dark:text-amber-500/20" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border border-green-200 dark:border-green-800 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-700 dark:text-green-300 mb-1">
                    Total Credits
                  </p>
                  <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                    {summary.total_credits.toLocaleString()}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-green-100 dark:bg-green-900/30">
                  <TrendingUp className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-red-200 dark:border-red-800 bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-950/20 dark:to-rose-950/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-red-700 dark:text-red-300 mb-1">
                    Total Debits
                  </p>
                  <p className="text-2xl font-bold text-red-900 dark:text-red-100">
                    {summary.total_debits.toLocaleString()}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-red-100 dark:bg-red-900/30">
                  <TrendingDown className="h-6 w-6 text-red-600 dark:text-red-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-blue-200 dark:border-blue-800 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-1">
                    Net Points
                  </p>
                  <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                    {summary.net_points.toLocaleString()}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                  <Gift className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Transaction History */}
        <Card className="border border-gray-200 dark:border-gray-800 shadow-sm">
          <CardHeader className="border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl font-semibold">Transaction History</CardTitle>
                <CardDescription className="mt-1">
                  Complete record of all reward points transactions
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-sm">
                {ledgerEntries.total} {ledgerEntries.total === 1 ? 'entry' : 'entries'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {ledgerEntries.data && ledgerEntries.data.length > 0 ? (
              <>
                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50/50 dark:bg-gray-900/50 hover:bg-gray-50/50 dark:hover:bg-gray-900/50">
                        <TableHead className="w-[50px]">Type</TableHead>
                        <TableHead>Source</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Points</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ledgerEntries.data.map((entry) => {
                        const isExpanded = expandedRows.has(entry.id)
                        const hasMetadata = entry.metadata && Object.keys(entry.metadata).length > 0
                        
                        return (
                          <React.Fragment key={entry.id}>
                            <TableRow 
                              className={cn(
                                "cursor-pointer transition-colors",
                                entry.type === 'credit' 
                                  ? "hover:bg-green-50/50 dark:hover:bg-green-950/10" 
                                  : "hover:bg-red-50/50 dark:hover:bg-red-950/10"
                              )}
                              onClick={() => hasMetadata && toggleRowExpansion(entry.id)}
                            >
                              <TableCell>
                                <div className={cn(
                                  "flex items-center justify-center w-10 h-10 rounded-lg",
                                  entry.type === 'credit'
                                    ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                                    : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
                                )}>
                                  {entry.type === 'credit' ? (
                                    <TrendingUp className="h-5 w-5" />
                                  ) : (
                                    <TrendingDown className="h-5 w-5" />
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-col">
                                  <span className="font-medium text-gray-900 dark:text-gray-100">
                                    {getSourceLabel(entry.source)}
                                  </span>
                                  <Badge 
                                    variant="outline" 
                                    className={cn(
                                      "w-fit mt-1 text-xs",
                                      entry.type === 'credit'
                                        ? "border-green-200 text-green-700 dark:border-green-800 dark:text-green-400"
                                        : "border-red-200 text-red-700 dark:border-red-800 dark:text-red-400"
                                    )}
                                  >
                                    {entry.type === 'credit' ? 'Credit' : 'Debit'}
                                  </Badge>
                                </div>
                              </TableCell>
                              <TableCell>
                                <span className="text-gray-700 dark:text-gray-300">
                                  {entry.description || '—'}
                                </span>
                              </TableCell>
                              <TableCell className="text-right">
                                <span className={cn(
                                  "text-lg font-semibold",
                                  entry.type === 'credit'
                                    ? "text-green-700 dark:text-green-400"
                                    : "text-red-700 dark:text-red-400"
                                )}>
                                  {entry.type === 'credit' ? '+' : '−'}
                                  {entry.points.toLocaleString()}
                                </span>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                  <Calendar className="h-4 w-4" />
                                  <span>{formatDateShort(entry.created_at)}</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                {hasMetadata && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      toggleRowExpansion(entry.id)
                                    }}
                                    className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                  >
                                    {isExpanded ? (
                                      <ChevronUp className="h-4 w-4 text-gray-500" />
                                    ) : (
                                      <ChevronDown className="h-4 w-4 text-gray-500" />
                                    )}
                                  </button>
                                )}
                              </TableCell>
                            </TableRow>
                            {isExpanded && hasMetadata && (
                              <TableRow className="bg-gray-50/30 dark:bg-gray-900/30">
                                <TableCell colSpan={6} className="p-4">
                                  <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                                    <div className="flex items-center gap-2 mb-3">
                                      <Info className="h-4 w-4 text-gray-500" />
                                      <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                                        Transaction Details
                                      </span>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                      {/* Merchant Hub Redemption Details */}
                                      {(entry.source === 'merchant_hub_redemption' || entry.source === 'merchant_hub_redemption_refund') && (
                                        <>
                                          {entry.metadata.offer_title && (
                                            <div>
                                              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                                                Offer
                                              </p>
                                              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                                {entry.metadata.offer_title}
                                              </p>
                                            </div>
                                          )}
                                          {entry.metadata.merchant_name && (
                                            <div>
                                              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                                                Merchant
                                              </p>
                                              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                                {entry.metadata.merchant_name}
                                              </p>
                                            </div>
                                          )}
                                          {entry.metadata.receipt_code && (
                                            <div>
                                              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                                                Receipt Code
                                              </p>
                                              <p className="text-sm font-mono font-semibold text-gray-900 dark:text-gray-100">
                                                {entry.metadata.receipt_code}
                                              </p>
                                            </div>
                                          )}
                                          {entry.source === 'merchant_hub_redemption_refund' && entry.metadata.original_points_spent && (
                                            <div>
                                              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                                                Original Points
                                              </p>
                                              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                                {entry.metadata.original_points_spent} pts
                                              </p>
                                            </div>
                                          )}
                                        </>
                                      )}
                                      {/* Volunteer Assessment Details */}
                                      {entry.metadata.grade && (
                                        <div>
                                          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                                            Grade
                                          </p>
                                          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                            {entry.metadata.grade}
                                          </p>
                                        </div>
                                      )}
                                      {entry.metadata.base_points && (
                                        <div>
                                          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                                            Base Points
                                          </p>
                                          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                            {entry.metadata.base_points} pts
                                          </p>
                                        </div>
                                      )}
                                      {entry.metadata.multiplier && (
                                        <div>
                                          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                                            Multiplier
                                          </p>
                                          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                            {Math.round(entry.metadata.multiplier * 100)}%
                                          </p>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </TableCell>
                              </TableRow>
                            )}
                          </React.Fragment>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden space-y-3 p-4">
                  {ledgerEntries.data.map((entry) => {
                    const isExpanded = expandedRows.has(entry.id)
                    const hasMetadata = entry.metadata && Object.keys(entry.metadata).length > 0
                    
                    return (
                      <div
                        key={entry.id}
                        className={cn(
                          "border rounded-lg p-4 transition-all",
                          entry.type === 'credit'
                            ? "border-green-200 dark:border-green-800 bg-green-50/30 dark:bg-green-950/10"
                            : "border-red-200 dark:border-red-800 bg-red-50/30 dark:bg-red-950/10"
                        )}
                      >
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="flex items-start gap-3 flex-1">
                            <div className={cn(
                              "p-2 rounded-lg",
                              entry.type === 'credit'
                                ? "bg-green-100 dark:bg-green-900/30"
                                : "bg-red-100 dark:bg-red-900/30"
                            )}>
                              {entry.type === 'credit' ? (
                                <TrendingUp className={cn(
                                  "h-5 w-5",
                                  entry.type === 'credit'
                                    ? "text-green-600 dark:text-green-400"
                                    : "text-red-600 dark:text-red-400"
                                )} />
                              ) : (
                                <TrendingDown className="h-5 w-5 text-red-600 dark:text-red-400" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge className={cn(
                                  "text-xs",
                                  entry.type === 'credit'
                                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                    : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                                )}>
                                  {entry.type === 'credit' ? 'Credit' : 'Debit'}
                                </Badge>
                                <Badge variant="outline" className="text-xs">
                                  {getSourceLabel(entry.source)}
                                </Badge>
                              </div>
                              <p className={cn(
                                "text-lg font-semibold mb-1",
                                entry.type === 'credit'
                                  ? "text-green-700 dark:text-green-400"
                                  : "text-red-700 dark:text-red-400"
                              )}>
                                {entry.type === 'credit' ? '+' : '−'}
                                {entry.points.toLocaleString()} Points
                              </p>
                              {entry.description && (
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                                  {entry.description}
                                </p>
                              )}
                              <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                                <Calendar className="h-3 w-3" />
                                <span>{formatDateShort(entry.created_at)}</span>
                              </div>
                            </div>
                          </div>
                          {hasMetadata && (
                            <button
                              onClick={() => toggleRowExpansion(entry.id)}
                              className="p-1 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                            >
                              {isExpanded ? (
                                <ChevronUp className="h-4 w-4 text-gray-500" />
                              ) : (
                                <ChevronDown className="h-4 w-4 text-gray-500" />
                              )}
                            </button>
                          )}
                        </div>
                        {isExpanded && hasMetadata && (
                          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                            <div className="flex items-center gap-2 mb-2">
                              <Info className="h-4 w-4 text-gray-500" />
                              <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                                Transaction Details
                              </span>
                            </div>
                            <div className="space-y-2">
                              {/* Merchant Hub Redemption Details */}
                                      {(entry.source === 'merchant_hub_redemption' || entry.source === 'merchant_hub_redemption_refund') && (
                                <>
                                  {entry.metadata.offer_title && (
                                    <div className="flex justify-between text-xs">
                                      <span className="text-gray-500 dark:text-gray-400">Offer:</span>
                                      <span className="font-semibold text-gray-900 dark:text-gray-100">
                                        {entry.metadata.offer_title}
                                      </span>
                                    </div>
                                  )}
                                  {entry.metadata.merchant_name && (
                                    <div className="flex justify-between text-xs">
                                      <span className="text-gray-500 dark:text-gray-400">Merchant:</span>
                                      <span className="font-semibold text-gray-900 dark:text-gray-100">
                                        {entry.metadata.merchant_name}
                                      </span>
                                    </div>
                                  )}
                                  {entry.metadata.receipt_code && (
                                    <div className="flex justify-between text-xs">
                                      <span className="text-gray-500 dark:text-gray-400">Receipt Code:</span>
                                      <span className="font-mono font-semibold text-gray-900 dark:text-gray-100">
                                        {entry.metadata.receipt_code}
                                      </span>
                                    </div>
                                  )}
                                  {entry.source === 'merchant_hub_redemption_refund' && entry.metadata.original_points_spent && (
                                    <div className="flex justify-between text-xs">
                                      <span className="text-gray-500 dark:text-gray-400">Original Points:</span>
                                      <span className="font-semibold text-gray-900 dark:text-gray-100">
                                        {entry.metadata.original_points_spent} pts
                                      </span>
                                    </div>
                                  )}
                                </>
                              )}
                              {/* Volunteer Assessment Details */}
                              {entry.metadata.grade && (
                                <div className="flex justify-between text-xs">
                                  <span className="text-gray-500 dark:text-gray-400">Grade:</span>
                                  <span className="font-semibold text-gray-900 dark:text-gray-100">
                                    {entry.metadata.grade}
                                  </span>
                                </div>
                              )}
                              {entry.metadata.base_points && (
                                <div className="flex justify-between text-xs">
                                  <span className="text-gray-500 dark:text-gray-400">Base Points:</span>
                                  <span className="font-semibold text-gray-900 dark:text-gray-100">
                                    {entry.metadata.base_points} pts
                                  </span>
                                </div>
                              )}
                              {entry.metadata.multiplier && (
                                <div className="flex justify-between text-xs">
                                  <span className="text-gray-500 dark:text-gray-400">Multiplier:</span>
                                  <span className="font-semibold text-gray-900 dark:text-gray-100">
                                    {Math.round(entry.metadata.multiplier * 100)}%
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* Pagination */}
                {ledgerEntries.last_page > 1 && (
                  <div className="border-t border-gray-200 dark:border-gray-700 px-6 py-4 bg-gray-50/50 dark:bg-gray-900/50">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        Showing <span className="font-medium text-gray-900 dark:text-gray-100">
                          {ledgerEntries.from || 0}
                        </span> to{" "}
                        <span className="font-medium text-gray-900 dark:text-gray-100">
                          {ledgerEntries.to || 0}
                        </span> of{" "}
                        <span className="font-medium text-gray-900 dark:text-gray-100">
                          {ledgerEntries.total}
                        </span> entries
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handlePageChange(ledgerEntries.current_page - 1)}
                          disabled={ledgerEntries.current_page === 1}
                          className="px-4 py-2 text-sm font-medium border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          Previous
                        </button>
                        <div className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md">
                          Page {ledgerEntries.current_page} of {ledgerEntries.last_page}
                        </div>
                        <button
                          onClick={() => handlePageChange(ledgerEntries.current_page + 1)}
                          disabled={ledgerEntries.current_page === ledgerEntries.last_page}
                          className="px-4 py-2 text-sm font-medium border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-16 px-4">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 mb-4">
                  <Gift className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  No Transactions Yet
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 max-w-sm mx-auto">
                  Your reward points transaction history will appear here once you start earning or redeeming points.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </ProfileLayout>
  )
}

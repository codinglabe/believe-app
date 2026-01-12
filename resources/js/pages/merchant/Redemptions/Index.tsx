import React, { useState, useEffect } from 'react'
import { Head, Link, router, usePage } from '@inertiajs/react'
import { MerchantCard, MerchantCardContent, MerchantCardHeader, MerchantCardTitle } from '@/components/merchant-ui'
import { MerchantButton } from '@/components/merchant-ui'
import { MerchantBadge } from '@/components/merchant-ui'
import { MerchantDashboardLayout } from '@/components/merchant'
import { Search, Filter, CheckCircle2, Clock, XCircle, Eye, Download, Gift } from 'lucide-react'
import { motion } from 'framer-motion'

interface Redemption {
  id: string
  offerTitle: string
  customerName: string
  customerEmail: string
  pointsUsed: number
  cashPaid?: number
  status: 'pending' | 'approved' | 'fulfilled' | 'canceled'
  redeemedAt: string
  code?: string
}

interface Props {
  redemptions: {
    data: Redemption[]
    current_page: number
    last_page: number
    per_page: number
    total: number
  }
  stats: {
    total: number
    completed: number
    pending: number
    totalPoints: number
    totalCash: number
  }
  filters: {
    search: string
    status: string
  }
}

export default function RedemptionsIndex({ redemptions, stats, filters: initialFilters }: Props) {
  const [searchQuery, setSearchQuery] = useState(initialFilters.search || '')
  // Set statusFilter to null if status is empty string (means "All")
  const [statusFilter, setStatusFilter] = useState<string | null>(
    initialFilters.status && initialFilters.status !== '' ? initialFilters.status : null
  )

  // Don't trigger effect on initial load if filters are already set from URL
  const [isInitialLoad, setIsInitialLoad] = useState(true)

  useEffect(() => {
    if (isInitialLoad) {
      setIsInitialLoad(false)
      return
    }

    const timeoutId = setTimeout(() => {
      const params: any = {
        search: searchQuery || '',
      }

      // Only add status if it's not null (null means "All")
      if (statusFilter !== null) {
        params.status = statusFilter
      }

      router.get('/redemptions', params, {
        preserveState: true,
        replace: true,
      })
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [searchQuery, statusFilter])

  const handleStatusFilter = (status: string | null) => {
    setStatusFilter(status)
  }

  const getStatusBadge = (status: string) => {
    const styles = {
      approved: 'bg-green-500/20 text-green-400 border-green-500/30',
      fulfilled: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      canceled: 'bg-red-500/20 text-red-400 border-red-500/30'
    }
    return styles[status as keyof typeof styles] || 'bg-gray-500/20 text-gray-400 border-gray-500/30'
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
      case 'fulfilled':
        return <CheckCircle2 className="h-4 w-4" />
      case 'pending':
        return <Clock className="h-4 w-4" />
      case 'canceled':
        return <XCircle className="h-4 w-4" />
      default:
        return null
    }
  }

  // Use stats from props

  return (
    <>
      <Head title="Redemptions - Merchant Dashboard" />
      <MerchantDashboardLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Redemptions</h1>
              <p className="text-gray-400">Manage and track all offer redemptions</p>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <MerchantCard>
              <MerchantCardContent className="p-4">
                <p className="text-sm text-gray-400 mb-1">Total Redemptions</p>
                <p className="text-2xl font-bold text-white">{stats.total}</p>
              </MerchantCardContent>
            </MerchantCard>
            <MerchantCard>
              <MerchantCardContent className="p-4">
                <p className="text-sm text-gray-400 mb-1">Completed</p>
                <p className="text-2xl font-bold text-green-400">{stats.completed}</p>
              </MerchantCardContent>
            </MerchantCard>
            <MerchantCard>
              <MerchantCardContent className="p-4">
                <p className="text-sm text-gray-400 mb-1">Pending</p>
                <p className="text-2xl font-bold text-yellow-400">{stats.pending}</p>
              </MerchantCardContent>
            </MerchantCard>
            <MerchantCard>
              <MerchantCardContent className="p-4">
                <p className="text-sm text-gray-400 mb-1">Total Points</p>
                <p className="text-2xl font-bold text-[#FF1493]">{stats.totalPoints.toLocaleString()}</p>
              </MerchantCardContent>
            </MerchantCard>
          </div>

          {/* Filters */}
          <MerchantCard>
            <MerchantCardContent className="p-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Search by offer, customer, or code..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const params: any = {
                          search: searchQuery || '',
                        }

                        if (statusFilter !== null) {
                          params.status = statusFilter
                        }

                        router.get('/redemptions', params, {
                          preserveState: true,
                          replace: true,
                        })
                      }
                    }}
                    className="w-full pl-10 pr-4 py-2 bg-black/50 border border-[#FF1493]/20 rounded-lg text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FF1493]/50 focus:border-[#FF1493]/50"
                  />
                </div>
                <div className="flex gap-2">
                  <MerchantButton
                    variant={statusFilter === null ? 'default' : 'outline'}
                    onClick={() => handleStatusFilter(null)}
                    size="sm"
                  >
                    All
                  </MerchantButton>
                  <MerchantButton
                    variant={statusFilter === 'approved' ? 'default' : 'outline'}
                    onClick={() => handleStatusFilter('approved')}
                    size="sm"
                  >
                    Approved
                  </MerchantButton>
                  <MerchantButton
                    variant={statusFilter === 'fulfilled' ? 'default' : 'outline'}
                    onClick={() => handleStatusFilter('fulfilled')}
                    size="sm"
                  >
                    Fulfilled
                  </MerchantButton>
                  <MerchantButton
                    variant={statusFilter === 'pending' ? 'default' : 'outline'}
                    onClick={() => handleStatusFilter('pending')}
                    size="sm"
                  >
                    Pending
                  </MerchantButton>
                  <MerchantButton
                    variant={statusFilter === 'canceled' ? 'default' : 'outline'}
                    onClick={() => handleStatusFilter('canceled')}
                    size="sm"
                  >
                    Canceled
                  </MerchantButton>
                </div>
              </div>
            </MerchantCardContent>
          </MerchantCard>

          {/* Redemptions Table */}
          <MerchantCard>
            <MerchantCardHeader>
              <div className="flex items-center justify-between">
                <MerchantCardTitle className="text-white">Recent Redemptions</MerchantCardTitle>
                <MerchantButton variant="outline" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </MerchantButton>
              </div>
            </MerchantCardHeader>
            <MerchantCardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#FF1493]/20">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">Offer</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">Customer</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">Points</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">Cash</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">Status</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">Date</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {redemptions && redemptions.data && redemptions.data.length > 0 ? (
                      redemptions.data.map((redemption, index) => (
                      <motion.tr
                        key={redemption.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.05 }}
                        className="border-b border-[#FF1493]/10 hover:bg-[#FF1493]/5 transition-colors"
                      >
                        <td className="py-4 px-4">
                          <p className="font-medium text-white">{redemption.offerTitle}</p>
                          {redemption.code && (
                            <p className="text-xs text-gray-400">Code: {redemption.code}</p>
                          )}
                        </td>
                        <td className="py-4 px-4">
                          <p className="text-white">{redemption.customerName}</p>
                          <p className="text-xs text-gray-400">{redemption.customerEmail}</p>
                        </td>
                        <td className="py-4 px-4">
                          <p className="text-[#FF1493] font-semibold">{redemption.pointsUsed.toLocaleString()}</p>
                        </td>
                        <td className="py-4 px-4">
                          {redemption.cashPaid ? (
                            <p className="text-white font-semibold">${redemption.cashPaid.toFixed(2)}</p>
                          ) : (
                            <p className="text-gray-500">-</p>
                          )}
                        </td>
                        <td className="py-4 px-4">
                          <MerchantBadge className={getStatusBadge(redemption.status)}>
                            <span className="flex items-center gap-1">
                              {getStatusIcon(redemption.status)}
                              {redemption.status.charAt(0).toUpperCase() + redemption.status.slice(1)}
                            </span>
                          </MerchantBadge>
                        </td>
                        <td className="py-4 px-4">
                          <p className="text-sm text-gray-400">
                            {new Date(redemption.redeemedAt).toLocaleDateString()}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(redemption.redeemedAt).toLocaleTimeString()}
                          </p>
                        </td>
                        <td className="py-4 px-4">
                          <Link href={`/redemptions/${redemption.id}`}>
                            <MerchantButton variant="ghost" size="sm">
                              <Eye className="w-4 h-4" />
                            </MerchantButton>
                          </Link>
                        </td>
                      </motion.tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="py-12 text-center">
                          <div className="flex flex-col items-center justify-center">
                            <Gift className="w-16 h-16 text-gray-500 mb-4 opacity-50" />
                            <p className="text-gray-400 text-lg font-medium mb-2">
                              {searchQuery || statusFilter ? 'No redemptions found matching your filters.' : 'No redemptions yet.'}
                            </p>
                            {statusFilter && (
                              <p className="text-gray-500 text-sm">
                                Try selecting "All" to see all redemptions, or check other status filters.
                              </p>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {redemptions.data.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-gray-400 mb-4">
                    {searchQuery || statusFilter ? 'No redemptions found matching your filters.' : 'No redemptions yet.'}
                  </p>
                </div>
              )}

              {/* Pagination */}
              {redemptions.last_page > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-[#FF1493]/20">
                  <div className="text-sm text-gray-400">
                    Showing {((redemptions.current_page - 1) * redemptions.per_page) + 1} to {Math.min(redemptions.current_page * redemptions.per_page, redemptions.total)} of {redemptions.total} redemptions
                  </div>
                  <div className="flex gap-2">
                    {redemptions.current_page > 1 && (
                      <MerchantButton
                        variant="outline"
                        size="sm"
                        onClick={() => router.get('/redemptions', {
                          ...initialFilters,
                          page: redemptions.current_page - 1,
                        })}
                      >
                        Previous
                      </MerchantButton>
                    )}
                    {redemptions.current_page < redemptions.last_page && (
                      <MerchantButton
                        variant="outline"
                        size="sm"
                        onClick={() => router.get('/redemptions', {
                          ...initialFilters,
                          page: redemptions.current_page + 1,
                        })}
                      >
                        Next
                      </MerchantButton>
                    )}
                  </div>
                </div>
              )}
            </MerchantCardContent>
          </MerchantCard>
        </div>
      </MerchantDashboardLayout>
    </>
  )
}


import React, { useState } from 'react'
import { Head, Link } from '@inertiajs/react'
import { MerchantCard, MerchantCardContent, MerchantCardHeader, MerchantCardTitle } from '@/components/merchant-ui'
import { MerchantButton } from '@/components/merchant-ui'
import { MerchantBadge } from '@/components/merchant-ui'
import { MerchantDashboardLayout } from '@/components/merchant'
import { Search, Filter, CheckCircle2, Clock, XCircle, Eye, Download } from 'lucide-react'
import { motion } from 'framer-motion'

interface Redemption {
  id: string
  offerTitle: string
  customerName: string
  customerEmail: string
  pointsUsed: number
  cashPaid?: number
  status: 'pending' | 'completed' | 'cancelled'
  redeemedAt: string
  code?: string
}

export default function RedemptionsIndex() {
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string | null>(null)

  // Mock data - replace with actual data from backend
  const redemptions: Redemption[] = [
    {
      id: '1',
      offerTitle: 'Gift Card - $50 Value',
      customerName: 'John Doe',
      customerEmail: 'john@example.com',
      pointsUsed: 5000,
      cashPaid: 10,
      status: 'completed',
      redeemedAt: '2024-01-15T10:30:00',
      code: 'RED-12345'
    },
    {
      id: '2',
      offerTitle: 'Wireless Earbuds',
      customerName: 'Jane Smith',
      customerEmail: 'jane@example.com',
      pointsUsed: 10000,
      cashPaid: 25,
      status: 'pending',
      redeemedAt: '2024-01-16T14:20:00',
      code: 'RED-12346'
    },
    {
      id: '3',
      offerTitle: 'Fitness Class Pass',
      customerName: 'Bob Johnson',
      customerEmail: 'bob@example.com',
      pointsUsed: 7500,
      status: 'completed',
      redeemedAt: '2024-01-14T09:15:00',
      code: 'RED-12347'
    },
    {
      id: '4',
      offerTitle: 'Dinner for Two',
      customerName: 'Alice Williams',
      customerEmail: 'alice@example.com',
      pointsUsed: 8000,
      cashPaid: 30,
      status: 'cancelled',
      redeemedAt: '2024-01-13T18:45:00',
      code: 'RED-12348'
    }
  ]

  const filteredRedemptions = redemptions.filter(redemption => {
    const matchesSearch = 
      redemption.offerTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      redemption.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      redemption.customerEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
      redemption.code?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = !statusFilter || redemption.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const getStatusBadge = (status: string) => {
    const styles = {
      completed: 'bg-green-500/20 text-green-400 border-green-500/30',
      pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      cancelled: 'bg-red-500/20 text-red-400 border-red-500/30'
    }
    return styles[status as keyof typeof styles] || 'bg-gray-500/20 text-gray-400 border-gray-500/30'
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4" />
      case 'pending':
        return <Clock className="h-4 w-4" />
      case 'cancelled':
        return <XCircle className="h-4 w-4" />
      default:
        return null
    }
  }

  const stats = {
    total: redemptions.length,
    completed: redemptions.filter(r => r.status === 'completed').length,
    pending: redemptions.filter(r => r.status === 'pending').length,
    totalPoints: redemptions.reduce((sum, r) => sum + r.pointsUsed, 0),
    totalCash: redemptions.reduce((sum, r) => sum + (r.cashPaid || 0), 0)
  }

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
                    className="w-full pl-10 pr-4 py-2 bg-black/50 border border-[#FF1493]/20 rounded-lg text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FF1493]/50 focus:border-[#FF1493]/50"
                  />
                </div>
                <div className="flex gap-2">
                  <MerchantButton
                    variant={statusFilter === null ? 'default' : 'outline'}
                    onClick={() => setStatusFilter(null)}
                    size="sm"
                  >
                    All
                  </MerchantButton>
                  <MerchantButton
                    variant={statusFilter === 'completed' ? 'default' : 'outline'}
                    onClick={() => setStatusFilter('completed')}
                    size="sm"
                  >
                    Completed
                  </MerchantButton>
                  <MerchantButton
                    variant={statusFilter === 'pending' ? 'default' : 'outline'}
                    onClick={() => setStatusFilter('pending')}
                    size="sm"
                  >
                    Pending
                  </MerchantButton>
                  <MerchantButton
                    variant={statusFilter === 'cancelled' ? 'default' : 'outline'}
                    onClick={() => setStatusFilter('cancelled')}
                    size="sm"
                  >
                    Cancelled
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
                    {filteredRedemptions.map((redemption, index) => (
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
                    ))}
                  </tbody>
                </table>
              </div>

              {filteredRedemptions.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-gray-400 mb-4">
                    {searchQuery || statusFilter ? 'No redemptions found matching your filters.' : 'No redemptions yet.'}
                  </p>
                </div>
              )}
            </MerchantCardContent>
          </MerchantCard>
        </div>
      </MerchantDashboardLayout>
    </>
  )
}


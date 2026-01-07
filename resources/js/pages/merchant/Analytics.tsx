import React, { useState } from 'react'
import { Head } from '@inertiajs/react'
import { MerchantCard, MerchantCardContent, MerchantCardHeader, MerchantCardTitle } from '@/components/merchant-ui'
import { MerchantDashboardLayout } from '@/components/merchant'
import { AnalyticsChart } from '@/components/merchant/AnalyticsChart'
import { TrendingUp, TrendingDown, DollarSign, Gift, Users, BarChart3 } from 'lucide-react'
import { motion } from 'framer-motion'

export default function Analytics() {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d')

  // Mock data - replace with actual data from backend
  const weeklyRedemptions = [
    { week: 'Week 1', value: 1200 },
    { week: 'Week 2', value: 1800 },
    { week: 'Week 3', value: 1500 },
    { week: 'Week 4', value: 2200 },
    { week: 'Week 5', value: 1900 },
    { week: 'Week 6', value: 2500 },
    { week: 'Week 7', value: 2100 }
  ]

  const revenueData = [
    { week: 'W1', value: 800 },
    { week: 'W2', value: 1200 },
    { week: 'W3', value: 1000 },
    { week: 'W4', value: 1500 },
    { week: 'W5', value: 1300 },
    { week: 'W6', value: 1800 },
    { week: 'W7', value: 1600 }
  ]

  const topOffers = [
    { id: '1', title: 'Gift Card - $50 Value', redemptions: 245, revenue: 2450 },
    { id: '2', title: 'Wireless Earbuds', redemptions: 120, revenue: 3000 },
    { id: '3', title: 'Fitness Class Pass', redemptions: 89, revenue: 0 },
    { id: '4', title: 'Dinner for Two', redemptions: 67, revenue: 2010 }
  ]

  const stats = {
    totalRedemptions: 521,
    totalRevenue: 7460,
    averagePointsPerRedemption: 7500,
    activeCustomers: 342,
    redemptionGrowth: 12.5,
    revenueGrowth: 8.3
  }

  return (
    <>
      <Head title="Analytics - Merchant Dashboard" />
      <MerchantDashboardLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Analytics</h1>
              <p className="text-gray-400">Track your business performance and insights</p>
            </div>
            <div className="flex gap-2">
              {(['7d', '30d', '90d', '1y'] as const).map((range) => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    timeRange === range
                      ? 'bg-gradient-to-r from-[#FF1493] via-[#DC143C] to-[#E97451] text-white'
                      : 'bg-black/50 text-gray-400 hover:text-white hover:bg-black/70'
                  }`}
                >
                  {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : range === '90d' ? '90 Days' : '1 Year'}
                </button>
              ))}
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MerchantCard>
              <MerchantCardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-blue-500/20 rounded-lg">
                    <Gift className="h-6 w-6 text-blue-400" />
                  </div>
                  <div className="flex items-center gap-1 text-green-400">
                    <TrendingUp className="h-4 w-4" />
                    <span className="text-sm font-medium">+{stats.redemptionGrowth}%</span>
                  </div>
                </div>
                <p className="text-sm text-gray-400 mb-1">Total Redemptions</p>
                <p className="text-3xl font-bold text-white">{stats.totalRedemptions.toLocaleString()}</p>
              </MerchantCardContent>
            </MerchantCard>

            <MerchantCard>
              <MerchantCardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-green-500/20 rounded-lg">
                    <DollarSign className="h-6 w-6 text-green-400" />
                  </div>
                  <div className="flex items-center gap-1 text-green-400">
                    <TrendingUp className="h-4 w-4" />
                    <span className="text-sm font-medium">+{stats.revenueGrowth}%</span>
                  </div>
                </div>
                <p className="text-sm text-gray-400 mb-1">Total Revenue</p>
                <p className="text-3xl font-bold text-white">${stats.totalRevenue.toLocaleString()}</p>
              </MerchantCardContent>
            </MerchantCard>

            <MerchantCard>
              <MerchantCardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-purple-500/20 rounded-lg">
                    <BarChart3 className="h-6 w-6 text-purple-400" />
                  </div>
                </div>
                <p className="text-sm text-gray-400 mb-1">Avg Points/Redemption</p>
                <p className="text-3xl font-bold text-white">{stats.averagePointsPerRedemption.toLocaleString()}</p>
              </MerchantCardContent>
            </MerchantCard>

            <MerchantCard>
              <MerchantCardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-pink-500/20 rounded-lg">
                    <Users className="h-6 w-6 text-pink-400" />
                  </div>
                </div>
                <p className="text-sm text-gray-400 mb-1">Active Customers</p>
                <p className="text-3xl font-bold text-white">{stats.activeCustomers.toLocaleString()}</p>
              </MerchantCardContent>
            </MerchantCard>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <AnalyticsChart
              title="Weekly Points Redemptions"
              data={weeklyRedemptions}
              totalLabel="Total Points Redeemed"
              totalValue={weeklyRedemptions.reduce((sum, item) => sum + item.value, 0).toLocaleString()}
              icon={<BarChart3 className="w-5 h-5 text-gray-600 dark:text-gray-400" />}
            />

            <MerchantCard>
              <MerchantCardHeader>
                <MerchantCardTitle className="text-white">Revenue Trend</MerchantCardTitle>
              </MerchantCardHeader>
              <MerchantCardContent>
                <div className="h-64 flex items-end gap-2">
                  {revenueData.map((item, index) => {
                    const maxValue = Math.max(...revenueData.map(d => d.value))
                    const height = (item.value / maxValue) * 100
                    return (
                      <motion.div
                        key={index}
                        className="flex-1 flex flex-col items-center gap-1"
                        initial={{ height: 0 }}
                        animate={{ height: `${height}%` }}
                        transition={{ duration: 0.5, delay: index * 0.1 }}
                      >
                        <div
                          className="w-full bg-gradient-to-t from-green-500 via-emerald-500 to-teal-500 rounded-t hover:from-green-600 hover:via-emerald-600 hover:to-teal-600 transition-all duration-300 cursor-pointer shadow-lg shadow-green-500/30"
                          style={{ height: '100%' }}
                          title={`${item.week}: $${item.value}`}
                        />
                        <span className="text-xs text-gray-300 mt-1">
                          {item.week}
                        </span>
                      </motion.div>
                    )
                  })}
                </div>
                <div className="pt-4 border-t mt-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-300">
                      Total Revenue
                    </span>
                    <span className="text-lg font-bold text-white">
                      ${revenueData.reduce((sum, item) => sum + item.value, 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              </MerchantCardContent>
            </MerchantCard>
          </div>

          {/* Top Offers */}
          <MerchantCard>
            <MerchantCardHeader>
              <MerchantCardTitle className="text-white">Top Performing Offers</MerchantCardTitle>
            </MerchantCardHeader>
            <MerchantCardContent>
              <div className="space-y-4">
                {topOffers.map((offer, index) => (
                  <motion.div
                    key={offer.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                    className="flex items-center justify-between p-4 bg-black/30 rounded-lg hover:bg-black/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#FF1493] via-[#DC143C] to-[#E97451] flex items-center justify-center text-white font-bold">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-semibold text-white">{offer.title}</p>
                        <p className="text-sm text-gray-400">{offer.redemptions} redemptions</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-[#FF1493]">${offer.revenue.toLocaleString()}</p>
                      <p className="text-sm text-gray-400">Revenue</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </MerchantCardContent>
          </MerchantCard>
        </div>
      </MerchantDashboardLayout>
    </>
  )
}


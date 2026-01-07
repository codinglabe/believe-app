import React from 'react'
import { Head, Link } from '@inertiajs/react'
import { MerchantCard, MerchantCardContent, MerchantCardHeader, MerchantCardTitle } from '@/components/merchant-ui'
import { MerchantButton } from '@/components/merchant-ui'
import { MerchantDashboardLayout } from '@/components/merchant'
import { Building2, Gift, BarChart3, CheckCircle2, TrendingUp, ArrowRight, Plus } from 'lucide-react'
import { motion } from 'framer-motion'
import { AnalyticsChart } from '@/components/merchant/AnalyticsChart'

export default function MerchantDashboard() {
  // Mock data
  const weeklyRedemptions = [
    { week: 'Week 1', value: 1200 },
    { week: 'Week 2', value: 1800 },
    { week: 'Week 3', value: 1500 },
    { week: 'Week 4', value: 2200 },
    { week: 'Week 5', value: 1900 },
    { week: 'Week 6', value: 2500 },
    { week: 'Week 7', value: 2100 }
  ]

  const recentRedemptions = [
    { id: '1', points: 10000, status: 'completed' },
    { id: '2', points: 5000, status: 'completed' },
    { id: '3', points: 7500, status: 'completed' }
  ]

  const rewardsData = [
    { week: 'W1', value: 800 },
    { week: 'W2', value: 1200 },
    { week: 'W3', value: 1000 },
    { week: 'W4', value: 1500 },
    { week: 'W5', value: 1300 },
    { week: 'W6', value: 1800 },
    { week: 'W7', value: 1600 }
  ]

  return (
    <>
      <Head title="Merchant Dashboard" />
      <MerchantDashboardLayout>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-6 relative z-10"
        >
            {/* Quick Actions */}
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white">Overview</h2>
              <Link href="/offers/create">
                <MerchantButton>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Offer
                </MerchantButton>
              </Link>
            </div>

            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <MerchantCard className="transition-all duration-300 cursor-pointer hover:scale-105">
                <MerchantCardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-gradient-to-br from-[#FF1493] via-[#DC143C] to-[#E97451] rounded-lg shadow-lg shadow-[#FF1493]/50">
                        <Building2 className="w-5 h-5 text-white" />
                      </div>
                      <MerchantCardTitle className="text-base text-white">Active Offers</MerchantCardTitle>
                    </div>
                    <ArrowRight className="w-5 h-5 text-gray-400" />
                  </div>
                </MerchantCardHeader>
                <MerchantCardContent>
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-[#FF1493]" />
                    <span className="text-2xl font-bold text-white">
                      3 Active Deals
                    </span>
                  </div>
                </MerchantCardContent>
              </MerchantCard>

              <MerchantCard className="transition-all duration-300 cursor-pointer hover:scale-105">
                <MerchantCardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-gradient-to-br from-[#FF1493] via-[#DC143C] to-[#E97451] rounded-lg shadow-lg shadow-[#FF1493]/50">
                        <Gift className="w-5 h-5 text-white" />
                      </div>
                      <MerchantCardTitle className="text-base text-white">Redemptions</MerchantCardTitle>
                    </div>
                    <ArrowRight className="w-5 h-5 text-gray-400" />
                  </div>
                </MerchantCardHeader>
                <MerchantCardContent>
                  <div className="flex items-center gap-2">
                    <Gift className="w-4 h-4 text-[#FF1493]" />
                    <span className="text-2xl font-bold text-white">
                      4,265 Redemptions
                    </span>
                  </div>
                </MerchantCardContent>
              </MerchantCard>
            </div>

            {/* Analytics Section */}
            <div>
              <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                <BarChart3 className="w-6 h-6" />
                Analytics
              </h2>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <AnalyticsChart
                  title="Weekly Points Redemptions"
                  data={weeklyRedemptions}
                  totalLabel="Total Points Earned"
                  totalValue="18,500"
                  icon={<BarChart3 className="w-5 h-5 text-gray-600 dark:text-gray-400" />}
                />

                <MerchantCard className="transition-all duration-300">
                  <MerchantCardHeader>
                    <MerchantCardTitle className="text-lg text-white">Recent Redemptions</MerchantCardTitle>
                  </MerchantCardHeader>
                  <MerchantCardContent>
                    <div className="space-y-4">
                      {recentRedemptions.map((redemption) => (
                        <div 
                          key={redemption.id}
                          className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                            <span className="text-white font-semibold">
                              {redemption.points.toLocaleString()} Points Used
                            </span>
                          </div>
                        </div>
                      ))}
                      <div className="pt-4 border-t">
                        <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                          <CheckCircle2 className="w-5 h-5" />
                          <span className="font-medium">Enjoy your reward!</span>
                        </div>
                      </div>
                    </div>
                  </MerchantCardContent>
                </MerchantCard>
              </div>

              {/* Total Rewards Redeemed Chart */}
              <div className="mt-6">
                <MerchantCard className="transition-all duration-300">
                  <MerchantCardHeader>
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-[#FF1493]" />
                      <MerchantCardTitle className="text-lg text-white">Total Rewards Redeemed</MerchantCardTitle>
                    </div>
                  </MerchantCardHeader>
                  <MerchantCardContent>
                    <div className="h-32 flex items-end gap-2">
                      {rewardsData.map((item, index) => {
                        const maxValue = Math.max(...rewardsData.map(d => d.value))
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
                              className="w-full bg-gradient-to-t from-[#FF1493] via-[#DC143C] to-[#E97451] rounded-t hover:from-[#FF1FA3] hover:via-[#EC1F4C] hover:to-[#F98461] transition-all duration-300 cursor-pointer shadow-lg shadow-[#FF1493]/30"
                              style={{ height: '100%' }}
                              title={`${item.week}: ${item.value}`}
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
                          Total Rewards Redeemed
                        </span>
                        <span className="text-lg font-bold text-white">
                          12,700
                        </span>
                      </div>
                    </div>
                  </MerchantCardContent>
                </MerchantCard>
              </div>
            </div>
        </motion.div>
      </MerchantDashboardLayout>
    </>
  )
}

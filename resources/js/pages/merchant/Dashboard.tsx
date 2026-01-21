import React, { useEffect, useState } from 'react'
import { Head, Link, router } from '@inertiajs/react'
import { MerchantCard, MerchantCardContent, MerchantCardHeader, MerchantCardTitle } from '@/components/merchant-ui'
import { MerchantButton } from '@/components/merchant-ui'
import { MerchantDashboardLayout } from '@/components/merchant'
import { SubscriptionRequiredModal } from '@/components/merchant/SubscriptionRequiredModal'
import { Building2, Gift, BarChart3, CheckCircle2, TrendingUp, ArrowRight, Plus } from 'lucide-react'
import { motion } from 'framer-motion'
import { AnalyticsChart } from '@/components/merchant/AnalyticsChart'

interface WeeklyData {
  week: string
  value: number
}

interface RecentRedemption {
  id: string
  points: number
  status: string
  code?: string
  customer_name?: string
  offer_title?: string
  created_at?: string
}

interface Props {
  stats: {
    activeOffers: number
    totalRedemptions: number
    totalPointsEarned: number
    totalRewardsRedeemed: number
  }
  weeklyRedemptions: WeeklyData[]
  recentRedemptions: RecentRedemption[]
  rewardsData: WeeklyData[]
  subscription_required?: boolean
}

export default function MerchantDashboard({ stats, weeklyRedemptions, recentRedemptions, rewardsData, subscription_required }: Props) {
  // Use data from props, fallback to empty arrays if not provided
  const weeklyData = weeklyRedemptions || []
  const recentData = recentRedemptions || []
  const rewardsWeeklyData = rewardsData || []
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false)

  useEffect(() => {
    if (subscription_required) {
      setShowSubscriptionModal(true)
      // Clear the session flag
      router.reload({ only: [], preserveScroll: true, preserveState: true })
    }
  }, [subscription_required])

  return (
    <>
      <Head title="Merchant Dashboard" />
      <SubscriptionRequiredModal 
        isOpen={showSubscriptionModal} 
        onClose={() => setShowSubscriptionModal(false)} 
      />
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
                      {stats?.activeOffers || 0} Active {stats?.activeOffers === 1 ? 'Offer' : 'Offers'}
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
                      {stats?.totalRedemptions?.toLocaleString() || 0} Redemptions
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
                  data={weeklyData}
                  totalLabel="Total Points Earned"
                  totalValue={stats?.totalPointsEarned?.toLocaleString() || '0'}
                  icon={<BarChart3 className="w-5 h-5 text-gray-600 dark:text-gray-400" />}
                />

                <MerchantCard className="transition-all duration-300">
                  <MerchantCardHeader>
                    <MerchantCardTitle className="text-lg text-white">Recent Redemptions</MerchantCardTitle>
                  </MerchantCardHeader>
                  <MerchantCardContent>
                    <div className="space-y-4">
                      {recentData.length > 0 ? (
                        recentData.map((redemption) => (
                          <Link
                            key={redemption.id}
                            href={`/redemptions/${redemption.id}`}
                            className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                          >
                            <div className="flex items-center gap-3 flex-1">
                              <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <span className="text-white font-semibold block">
                                  {redemption.points?.toLocaleString() || 0} Points Used
                                </span>
                                {redemption.offer_title && (
                                  <span className="text-xs text-gray-400 block truncate">
                                    {redemption.offer_title}
                                  </span>
                                )}
                                {redemption.customer_name && (
                                  <span className="text-xs text-gray-500 block">
                                    {redemption.customer_name}
                                  </span>
                                )}
                              </div>
                            </div>
                            <ArrowRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          </Link>
                        ))
                      ) : (
                        <div className="text-center py-8 text-gray-400">
                          <Gift className="w-12 h-12 mx-auto mb-2 opacity-50" />
                          <p>No redemptions yet</p>
                        </div>
                      )}
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
                      {rewardsWeeklyData.map((item, index) => {
                        const maxValue = Math.max(...rewardsWeeklyData.map(d => d.value), 1)
                        const height = maxValue > 0 ? (item.value / maxValue) * 100 : 0
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
                          {stats?.totalRewardsRedeemed?.toLocaleString() || 0}
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

import React from 'react'
import { MerchantCard, MerchantCardContent, MerchantCardHeader, MerchantCardTitle } from '@/components/merchant-ui'
import { BarChart3, TrendingUp } from 'lucide-react'
import { motion } from 'framer-motion'

interface ChartData {
  week: string
  value: number
}

interface AnalyticsChartProps {
  title: string
  data: ChartData[]
  totalLabel?: string
  totalValue?: string | number
  icon?: React.ReactNode
}

export function AnalyticsChart({
  title,
  data,
  totalLabel,
  totalValue,
  icon
}: AnalyticsChartProps) {
  const maxValue = Math.max(...data.map(d => d.value), 1)

  return (
    <MerchantCard className="transition-all duration-300">
      <MerchantCardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {icon || <BarChart3 className="w-5 h-5 text-[#FF1493]" />}
            <MerchantCardTitle className="text-lg text-white">{title}</MerchantCardTitle>
          </div>
        </div>
      </MerchantCardHeader>
      <MerchantCardContent>
        <div className="space-y-4">
          <div className="flex items-end gap-2 h-32">
            {data.map((item, index) => {
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
                            <span className="text-xs text-gray-200 mt-1">
                              {item.week}
                            </span>
                </motion.div>
              )
            })}
          </div>
          {totalLabel && totalValue && (
            <div className="pt-4 border-t-2 border-[#FF1493]/30">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-200">
                  {totalLabel}
                </span>
                <span className="text-lg font-bold text-white bg-gradient-to-r from-[#FF1493] to-[#DC143C] bg-clip-text text-transparent">
                  {typeof totalValue === 'number' ? totalValue.toLocaleString() : totalValue}
                </span>
              </div>
            </div>
          )}
        </div>
      </MerchantCardContent>
    </MerchantCard>
  )
}


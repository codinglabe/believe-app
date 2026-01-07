import React from 'react'
import { MerchantCard, MerchantCardContent } from '@/components/merchant-ui'
import { MerchantButton } from '@/components/merchant-ui'
import { Coins, DollarSign } from 'lucide-react'
import { motion } from 'framer-motion'
import { Link } from '@inertiajs/react'

interface OfferCardProps {
  id: string
  title: string
  image: string
  pointsRequired: number
  cashRequired?: number
  merchantName?: string
  category?: string
  onClick?: () => void
}

export function OfferCard({
  id,
  title,
  image,
  pointsRequired,
  cashRequired,
  merchantName,
  category,
  onClick
}: OfferCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={{ y: -4 }}
      className="cursor-pointer"
    >
      <MerchantCard className="overflow-hidden transition-all duration-300 hover:scale-105">
        <div className="relative h-48 w-full bg-gray-800">
          <img 
            src={image} 
            alt={title}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/placeholder.jpg'
            }}
          />
        </div>
        <MerchantCardContent className="p-4">
          <h3 className="font-semibold text-lg text-white mb-2 line-clamp-2">
            {title}
          </h3>
          {merchantName && (
            <p className="text-sm text-gray-300 mb-3">
              {merchantName}
            </p>
          )}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1 bg-gradient-to-r from-[#FF1493]/20 via-[#DC143C]/20 to-[#E97451]/20 border-2 border-[#FF1493]/40 px-3 py-1.5 rounded-full backdrop-blur">
              <Coins className="w-4 h-4 text-[#FF1493]" />
              <span className="text-sm font-semibold text-white">
                {pointsRequired.toLocaleString()} Points
              </span>
            </div>
            {cashRequired && (
              <div className="flex items-center gap-1 bg-gradient-to-r from-[#FF1493]/20 via-[#DC143C]/20 to-[#E97451]/20 border-2 border-[#FF1493]/40 px-3 py-1.5 rounded-full backdrop-blur">
                <DollarSign className="w-4 h-4 text-[#FF1493]" />
                <span className="text-sm font-semibold text-white">
                  +${cashRequired}
                </span>
              </div>
            )}
          </div>
          {onClick && (
            <MerchantButton 
              className="w-full mt-4"
              onClick={onClick}
            >
              View Details
            </MerchantButton>
          )}
        </MerchantCardContent>
      </MerchantCard>
    </motion.div>
  )
}


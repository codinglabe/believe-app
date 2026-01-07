import React, { useState } from 'react'
import { Head } from '@inertiajs/react'
import { MerchantHeader } from '@/components/merchant'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Coins, DollarSign, Check, ArrowLeft } from 'lucide-react'
import { motion } from 'framer-motion'
import { router } from '@inertiajs/react'

interface OfferDetailProps {
  offer?: {
    id: string
    title: string
    image: string
    pointsRequired: number
    cashRequired?: number
    merchantName: string
    rules: string[]
  }
}

export default function OfferDetail({ offer }: OfferDetailProps) {
  const [selectedOption, setSelectedOption] = useState<'points' | 'hybrid'>('points')
  const [showRedeemButton, setShowRedeemButton] = useState(false)

  // Mock data if not provided
  const offerData = offer || {
    id: '3',
    title: 'Wireless Earbuds',
    image: '/placeholder.jpg',
    pointsRequired: 10000,
    cashRequired: 25,
    merchantName: 'Tech Store',
    rules: [
      'Limit 1 per member',
      'Points + Cash option available',
      'Valid for in-store redemption only'
    ]
  }

  const handleRedeem = () => {
    router.visit(`/merchant/offers/${offerData.id}/redeem`)
  }

  const handleBack = () => {
    router.visit('/merchant/hub')
  }

  return (
    <>
      <Head title={`${offerData.title} - Believe`} />
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <MerchantHeader 
          title="Believe"
          showBack
          onBackClick={handleBack}
        />

        <div className="container mx-auto px-4 pt-24 pb-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="max-w-2xl mx-auto"
          >
            <Card>
              <CardContent className="p-6">
                {/* Product Image */}
                <div className="mb-6">
                  <div className="relative h-64 w-full bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden">
                    <img 
                      src={offerData.image} 
                      alt={offerData.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/placeholder.jpg'
                      }}
                    />
                  </div>
                </div>

                {/* Product Title */}
                <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                  {offerData.title}
                </h1>

                {/* Pricing Options */}
                <div className="mb-6 space-y-3">
                  <div 
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      selectedOption === 'points' 
                        ? 'border-green-500 bg-green-50 dark:bg-green-900/20' 
                        : 'border-gray-200 dark:border-gray-700'
                    }`}
                    onClick={() => setSelectedOption('points')}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-4 h-4 rounded-full border-2 ${
                        selectedOption === 'points' 
                          ? 'border-green-500 bg-green-500' 
                          : 'border-gray-300'
                      }`}>
                        {selectedOption === 'points' && (
                          <div className="w-full h-full rounded-full bg-white scale-50"></div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Coins className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        <span className="text-xl font-bold text-gray-900 dark:text-gray-100">
                          {offerData.pointsRequired.toLocaleString()} Points
                        </span>
                      </div>
                    </div>
                  </div>

                  {offerData.cashRequired && (
                    <div 
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        selectedOption === 'hybrid' 
                          ? 'border-green-500 bg-green-50 dark:bg-green-900/20' 
                          : 'border-gray-200 dark:border-gray-700'
                      }`}
                      onClick={() => setSelectedOption('hybrid')}
                    >
                      <div className="flex items-center gap-2">
                        <div className={`w-4 h-4 rounded-full border-2 ${
                          selectedOption === 'hybrid' 
                            ? 'border-green-500 bg-green-500' 
                            : 'border-gray-300'
                        }`}>
                          {selectedOption === 'hybrid' && (
                            <div className="w-full h-full rounded-full bg-white scale-50"></div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Coins className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                          <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                            {(offerData.pointsRequired * 0.75).toLocaleString()} Pts
                          </span>
                          <span className="text-gray-600 dark:text-gray-400">+</span>
                          <DollarSign className="w-5 h-5 text-green-600 dark:text-green-400" />
                          <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                            ${offerData.cashRequired}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Redemption Rules */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
                    Redemption Rules
                  </h3>
                  <ul className="space-y-2">
                    {offerData.rules.map((rule, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <Check className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-700 dark:text-gray-300">{rule}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Redeem Button */}
                {showRedeemButton && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Button 
                      className="w-full bg-green-600 hover:bg-green-700 text-white text-lg font-semibold h-12"
                      onClick={handleRedeem}
                    >
                      Redeem Now
                    </Button>
                  </motion.div>
                )}

                {!showRedeemButton && (
                  <Button 
                    className="w-full bg-green-600 hover:bg-green-700 text-white text-lg font-semibold h-12"
                    onClick={() => setShowRedeemButton(true)}
                  >
                    Select Option to Redeem
                  </Button>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </>
  )
}


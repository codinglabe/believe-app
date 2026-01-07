import React from 'react'
import { Head } from '@inertiajs/react'
import { MerchantHeader } from '@/components/merchant'
import { PointsDisplay } from '@/components/merchant/PointsDisplay'
import { Button } from '@/components/ui/button'
import { ShoppingBag, Gift, Menu } from 'lucide-react'
import { motion } from 'framer-motion'
import { Link } from '@inertiajs/react'

export default function MerchantWelcome() {
  const pointsBalance = 12450

  return (
    <>
      <Head title={`Welcome Back - ${import.meta.env.VITE_APP_NAME || 'Believe'} Merchant`} />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white dark:from-gray-900 dark:to-gray-800">
        <MerchantHeader 
          showProfile
          onMenuClick={() => console.log('Menu clicked')}
          onProfileClick={() => console.log('Profile clicked')}
        />
        
        <div className="container mx-auto px-4 pt-24 pb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="max-w-2xl mx-auto"
          >
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                Welcome Back!
              </h2>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 mb-6">
              <div className="flex flex-col items-center justify-center py-8">
                <PointsDisplay 
                  points={pointsBalance} 
                  size="lg"
                  showLabel={true}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <Link href="/merchant/earn-points">
                  <Button 
                    className="w-full h-20 bg-green-600 hover:bg-green-700 text-white text-lg font-semibold shadow-lg"
                  >
                    <ShoppingBag className="w-6 h-6 mr-3" />
                    Earn Points
                  </Button>
                </Link>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                <Link href="/merchant/hub">
                  <Button 
                    className="w-full h-20 bg-blue-600 hover:bg-blue-700 text-white text-lg font-semibold shadow-lg"
                  >
                    <Gift className="w-6 h-6 mr-3" />
                    Redeem Points
                  </Button>
                </Link>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </>
  )
}


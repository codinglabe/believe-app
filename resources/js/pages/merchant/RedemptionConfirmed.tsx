import React from 'react'
import { Head } from '@inertiajs/react'
import { MerchantHeader } from '@/components/merchant'
import { PointsDisplay } from '@/components/merchant/PointsDisplay'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { CheckCircle2, QrCode } from 'lucide-react'
import { motion } from 'framer-motion'
import { router } from '@inertiajs/react'

export default function RedemptionConfirmed() {
  const lockedPoints = 10000

  const handleShowQRCode = () => {
    router.visit('/merchant/qr-code')
  }

  return (
    <>
      <Head title="Redemption Confirmed - Believe" />
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-white dark:from-gray-900 dark:to-gray-800">
        <MerchantHeader 
          onMenuClick={() => console.log('Menu clicked')}
        />

        <div className="container mx-auto px-4 pt-24 pb-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="max-w-md mx-auto"
          >
            <Card className="shadow-xl">
              <CardContent className="p-8">
                <div className="text-center mb-6">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                  >
                    <CheckCircle2 className="w-20 h-20 text-green-600 dark:text-green-400 mx-auto mb-4" />
                  </motion.div>
                  
                  <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-6">
                    Redemption Confirmed!
                  </h2>

                  <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-6 mb-6">
                    <div className="flex flex-col items-center">
                      <span className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        Points Locked
                      </span>
                      <PointsDisplay 
                        points={lockedPoints} 
                        size="md"
                        showLabel={false}
                      />
                    </div>
                  </div>

                  <p className="text-gray-700 dark:text-gray-300 mb-8">
                    Your points are reserved for this offer.
                  </p>

                  <Button 
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white text-lg font-semibold h-12"
                    onClick={handleShowQRCode}
                  >
                    <QrCode className="w-5 h-5 mr-2" />
                    Show QR Code
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </>
  )
}


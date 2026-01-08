import React, { useState } from 'react'
import { Head, usePage } from '@inertiajs/react'
import { MerchantHeader } from '@/components/merchant'
import { PointsDisplay } from '@/components/merchant/PointsDisplay'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { CheckCircle2, QrCode, Download, Share2 } from 'lucide-react'
import { motion } from 'framer-motion'

interface Redemption {
  id?: string
  code?: string
  points_used?: number
  cash_paid?: number
  status?: string
  qr_code_url?: string
  redeemed_at?: string
}

interface Props {
  redemption?: Redemption
}

export default function RedemptionConfirmed({ redemption: propRedemption }: Props) {
  const { props } = usePage()
  const redemption = propRedemption || (props as any).redemption || {
    code: 'RED-XXXXXXXX',
    points_used: 10000,
    cash_paid: 0,
    status: 'completed',
    qr_code_url: '/merchant/redemption/qr-code/RED-XXXXXXXX',
  }

  const [showQRCode, setShowQRCode] = useState(false)
  const lockedPoints = redemption.points_used || 10000

  const handleDownloadQR = () => {
    if (redemption.qr_code_url) {
      const link = document.createElement('a')
      link.href = redemption.qr_code_url
      link.download = `redemption-${redemption.code}.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  const handleShare = async () => {
    if (navigator.share && redemption.qr_code_url) {
      try {
        await navigator.share({
          title: 'Redemption QR Code',
          text: `Redemption Code: ${redemption.code}`,
          url: redemption.qr_code_url,
        })
      } catch (error) {
        console.error('Error sharing:', error)
      }
    }
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

                  {redemption.code && (
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 mb-6">
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                        Redemption Code
                      </p>
                      <p className="text-xl font-mono font-bold text-gray-900 dark:text-gray-100">
                        {redemption.code}
                      </p>
                    </div>
                  )}

                  <p className="text-gray-700 dark:text-gray-300 mb-8">
                    Your points are reserved for this offer. Show the QR code to the merchant to complete your redemption.
                  </p>

                  <Button 
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white text-lg font-semibold h-12 mb-3"
                    onClick={() => setShowQRCode(!showQRCode)}
                  >
                    <QrCode className="w-5 h-5 mr-2" />
                    {showQRCode ? 'Hide QR Code' : 'Show QR Code'}
                  </Button>

                  {showQRCode && redemption.qr_code_url && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-6"
                    >
                      <Card className="bg-white dark:bg-gray-800">
                        <CardContent className="p-6">
                          <div className="flex flex-col items-center">
                            <div className="p-4 bg-white rounded-lg mb-4">
                              <img
                                src={redemption.qr_code_url}
                                alt="Redemption QR Code"
                                className="w-64 h-64"
                                onError={(e) => {
                                  console.error('QR code failed to load')
                                }}
                              />
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 text-center">
                              Scan this QR code at the merchant location
                            </p>
                            <div className="flex gap-3 w-full">
                              <Button
                                variant="outline"
                                className="flex-1"
                                onClick={handleDownloadQR}
                              >
                                <Download className="w-4 h-4 mr-2" />
                                Download
                              </Button>
                              <Button
                                variant="outline"
                                className="flex-1"
                                onClick={handleShare}
                              >
                                <Share2 className="w-4 h-4 mr-2" />
                                Share
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </>
  )
}


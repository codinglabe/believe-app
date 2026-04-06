import React from 'react'
import { Head } from '@inertiajs/react'
import { MerchantHeader } from '@/components/merchant'
import { QRCodeDisplay } from '@/components/merchant/QRCodeDisplay'
import { router } from '@inertiajs/react'

export default function QRCodePage() {
  // Mock QR code data - in production, this would come from the backend
  const qrCodeData = JSON.stringify({
    transactionId: 'txn_123456789',
    merchantId: 'merchant_001',
    offerId: 'offer_003',
    timestamp: Date.now(),
    expiresAt: Date.now() + 3600000 // 1 hour
  })

  const handleDownload = () => {
    // In production, implement actual download functionality
    console.log('Download QR code')
  }

  const handleShare = () => {
    // In production, implement share functionality
    console.log('Share QR code')
  }

  return (
    <>
      <Head title="QR Code - Believe" />
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <MerchantHeader 
          title="QR Code"
          showBack
          onBackClick={() => router.visit('/merchant/redemption-confirmed')}
        />

        <div className="container mx-auto px-4 pt-24 pb-8">
          <QRCodeDisplay
            qrCodeData={qrCodeData}
            onDownload={handleDownload}
            onShare={handleShare}
            title="QR Code"
            instruction="Scan to Redeem"
          />
        </div>
      </div>
    </>
  )
}


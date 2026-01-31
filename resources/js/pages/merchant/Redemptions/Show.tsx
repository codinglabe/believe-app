import React, { useState } from 'react'
import { Head, Link } from '@inertiajs/react'
import { MerchantCard, MerchantCardContent, MerchantCardHeader, MerchantCardTitle } from '@/components/merchant-ui'
import { MerchantButton } from '@/components/merchant-ui'
import { MerchantBadge } from '@/components/merchant-ui'
import { MerchantDashboardLayout } from '@/components/merchant'
import { ArrowLeft, CheckCircle2, Clock, XCircle, Calendar, Gift, DollarSign, User, Mail, Hash, Download, Share2, QrCode, Camera } from 'lucide-react'
import { motion } from 'framer-motion'
import QRCodeScannerSimple from '@/components/merchant/QRCodeScannerSimple'

interface Redemption {
  id: string
  code: string
  offerTitle: string
  offerDescription?: string
  offerImage?: string
  customerName: string
  customerEmail: string
  pointsUsed: number
  cashPaid?: number
  status: 'pending' | 'approved' | 'fulfilled' | 'canceled'
  redeemedAt: string
  updatedAt?: string
  usedAt?: string | null
  qrCodeUrl: string
  pricingBreakdown?: {
    regularPrice: number
    discountPercentage: number
    discountAmount: number
    discountPrice: number
  } | null
}

interface Props {
  redemption: Redemption
}

export default function RedemptionShow({ redemption }: Props) {
  const [isScannerOpen, setIsScannerOpen] = useState(false)

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
      case 'fulfilled':
        return (
          <MerchantBadge className="bg-green-600/30 text-green-400 border-green-600/50 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            {status === 'fulfilled' ? 'Fulfilled' : 'Approved'}
          </MerchantBadge>
        )
      case 'pending':
        return (
          <MerchantBadge className="bg-yellow-600/30 text-yellow-400 border-yellow-600/50 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Pending
          </MerchantBadge>
        )
      case 'canceled':
        return (
          <MerchantBadge className="bg-red-600/30 text-red-400 border-red-600/50 flex items-center gap-1">
            <XCircle className="w-3 h-3" />
            Canceled
          </MerchantBadge>
        )
      default:
        return <MerchantBadge>{status}</MerchantBadge>
    }
  }

  const handleDownloadQR = () => {
    if (redemption.qrCodeUrl) {
      const link = document.createElement('a')
      link.href = redemption.qrCodeUrl
      link.download = `redemption-${redemption.code}.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  const handleShare = async () => {
    if (navigator.share && redemption.qrCodeUrl) {
      try {
        await navigator.share({
          title: 'Redemption QR Code',
          text: `Redemption Code: ${redemption.code}`,
          url: redemption.qrCodeUrl,
        })
      } catch (error) {
        console.error('Error sharing:', error)
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(redemption.code)
      alert('Redemption code copied to clipboard!')
    }
  }

  return (
    <>
      <Head title={`Redemption ${redemption.code} - Merchant Dashboard`} />
      <MerchantDashboardLayout>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-4 sm:space-y-6 relative z-10 px-4 sm:px-0"
        >
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <Link href="/redemptions">
              <MerchantButton variant="outline" size="sm">
                <ArrowLeft className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Back to Redemptions</span>
                <span className="sm:hidden">Back</span>
              </MerchantButton>
            </Link>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
              <MerchantButton
                onClick={() => setIsScannerOpen(true)}
                size="sm"
                className="bg-gradient-to-r from-[#FF1493] to-[#DC143C] hover:from-[#FF1493]/90 hover:to-[#DC143C]/90 w-full sm:w-auto"
              >
                <Camera className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Scan QR Code</span>
                <span className="sm:hidden">Scan</span>
              </MerchantButton>
              <div className="flex justify-center sm:justify-start">
                {getStatusBadge(redemption.status)}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Redemption Details */}
              <MerchantCard>
                <MerchantCardHeader>
                  <MerchantCardTitle className="text-white">Redemption Details</MerchantCardTitle>
                </MerchantCardHeader>
                <MerchantCardContent className="space-y-4 sm:space-y-6">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-white mb-2 break-words">{redemption.offerTitle}</h2>
                    {redemption.offerDescription && (
                      <p className="text-sm sm:text-base text-gray-400 mb-2 break-words">{redemption.offerDescription}</p>
                    )}
                    <p className="text-xs sm:text-sm text-gray-400 break-all">Redemption ID: {redemption.id}</p>
                  </div>

                  {redemption.offerImage && (
                    <div className="w-full h-40 sm:h-48 bg-gray-800 rounded-lg overflow-hidden">
                      <img
                        src={redemption.offerImage}
                        alt={redemption.offerTitle}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/placeholder.jpg'
                        }}
                      />
                    </div>
                  )}

                  <div className={`grid grid-cols-1 sm:grid-cols-2 ${redemption.pricingBreakdown ? 'lg:grid-cols-4' : ''} gap-3 sm:gap-4 pt-4 border-t border-[#FF1493]/20`}>
                    <div className="flex items-center gap-3 p-3 sm:p-4 bg-gradient-to-br from-[#FF1493]/10 via-[#DC143C]/10 to-[#E97451]/10 rounded-lg border border-[#FF1493]/20">
                      <Gift className="w-4 h-4 sm:w-5 sm:h-5 text-[#FF1493] flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs text-gray-400">Points Used</p>
                        <p className="text-base sm:text-lg font-bold text-white break-words">{redemption.pointsUsed.toLocaleString()}</p>
                      </div>
                    </div>
                    {redemption.pricingBreakdown ? (
                      <>
                        <div className="flex items-center gap-3 p-3 sm:p-4 bg-gradient-to-br from-[#FF1493]/10 via-[#DC143C]/10 to-[#E97451]/10 rounded-lg border border-[#FF1493]/20">
                          <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-[#FF1493] flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="text-xs text-gray-400">Regular Price</p>
                            <p className="text-base sm:text-lg font-bold text-white break-words line-through">${redemption.pricingBreakdown.regularPrice.toFixed(2)}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 sm:p-4 bg-gradient-to-br from-[#FF1493]/10 via-[#DC143C]/10 to-[#E97451]/10 rounded-lg border border-[#FF1493]/20">
                          <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-green-400 flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="text-xs text-gray-400">Discount ({redemption.pricingBreakdown.discountPercentage}%)</p>
                            <p className="text-base sm:text-lg font-bold text-green-400 break-words">-${redemption.pricingBreakdown.discountAmount.toFixed(2)}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 sm:p-4 bg-gradient-to-br from-[#FF1493]/10 via-[#DC143C]/10 to-[#E97451]/10 rounded-lg border border-[#FF1493]/20">
                          <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-[#FF1493] flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="text-xs text-gray-400">
                              {redemption.status === 'fulfilled' || redemption.usedAt ? 'You Paid' : 'Discounted Price'}
                            </p>
                            <p className="text-base sm:text-lg font-bold text-white break-words">${redemption.pricingBreakdown.discountPrice.toFixed(2)}</p>
                          </div>
                        </div>
                      </>
                    ) : redemption.cashPaid ? (
                      <div className="flex items-center gap-3 p-3 sm:p-4 bg-gradient-to-br from-[#FF1493]/10 via-[#DC143C]/10 to-[#E97451]/10 rounded-lg border border-[#FF1493]/20">
                        <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-[#FF1493] flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs text-gray-400">
                            {redemption.status === 'fulfilled' || redemption.usedAt ? 'You Paid' : 'Cash Paid'}
                          </p>
                          <p className="text-base sm:text-lg font-bold text-white break-words">${redemption.cashPaid.toFixed(2)}</p>
                        </div>
                      </div>
                    ) : null}
                  </div>

                  {redemption.code && (
                    <div className="p-3 sm:p-4 bg-black/30 rounded-lg border border-[#FF1493]/20">
                      <div className="flex items-center gap-2 mb-2">
                        <Hash className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <span className="text-xs sm:text-sm text-gray-400">Redemption Code</span>
                      </div>
                      <p className="text-lg sm:text-xl font-mono font-bold text-[#FF1493] break-all">{redemption.code}</p>
                    </div>
                  )}
                </MerchantCardContent>
              </MerchantCard>

              {/* QR Code */}
              <MerchantCard>
                <MerchantCardHeader>
                  <MerchantCardTitle className="text-white flex items-center gap-2">
                    <QrCode className="w-5 h-5" />
                    QR Code
                  </MerchantCardTitle>
                </MerchantCardHeader>
                <MerchantCardContent>
                  <div className="flex flex-col items-center space-y-3 sm:space-y-4">
                    <div className="p-2 sm:p-4 bg-white rounded-lg">
                      {redemption.qrCodeUrl ? (
                        <img
                          key={redemption.qrCodeUrl}
                          src={redemption.qrCodeUrl + '?t=' + Date.now()}
                          alt="QR Code"
                          className="w-48 h-48 sm:w-64 sm:h-64 object-contain"
                          onError={(e) => {
                            console.error('QR Code failed to load:', redemption.qrCodeUrl)
                            const img = e.target as HTMLImageElement
                            // Try to reload with fresh timestamp
                            if (!img.src.includes('error')) {
                              img.src = redemption.qrCodeUrl + '?t=' + Date.now() + '&retry=1'
                            } else {
                              // Show error message
                              const parent = img.parentElement
                              if (parent) {
                                parent.innerHTML = `
                                  <div class="w-48 h-48 sm:w-64 sm:h-64 flex flex-col items-center justify-center text-red-500 p-4 border-2 border-red-300 rounded">
                                    <svg class="w-8 h-8 sm:w-12 sm:h-12 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                    <p class="text-xs sm:text-sm text-center font-semibold">Failed to load QR code</p>
                                    <p class="text-xs text-gray-500 mt-2 text-center break-all px-2">Code: ${redemption.code}</p>
                                    <p class="text-xs text-gray-400 mt-1 text-center">Please refresh the page</p>
                                  </div>
                                `
                              }
                            }
                          }}
                          onLoad={() => {
                            console.log('QR Code loaded successfully')
                          }}
                        />
                      ) : (
                        <div className="w-48 h-48 sm:w-64 sm:h-64 flex items-center justify-center text-gray-400 border-2 border-dashed border-gray-300 rounded">
                          <p className="text-xs sm:text-sm text-center px-2">QR Code not available</p>
                        </div>
                      )}
                    </div>
                    <p className="text-xs sm:text-sm text-gray-400 text-center px-4">
                      Scan this QR code to verify the redemption
                    </p>
                    {redemption.qrCodeUrl && (
                      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
                        <MerchantButton
                          variant="outline"
                          size="sm"
                          onClick={handleDownloadQR}
                          className="w-full sm:w-auto"
                        >
                          <Download className="w-4 h-4 sm:mr-2" />
                          <span className="hidden sm:inline">Download</span>
                          <span className="sm:hidden">Download QR</span>
                        </MerchantButton>
                        {/* <MerchantButton
                          variant="outline"
                          size="sm"
                          onClick={handleShare}
                        >
                          <Share2 className="w-4 h-4 mr-2" />
                          Share
                        </MerchantButton> */}
                      </div>
                    )}
                  </div>
                </MerchantCardContent>
              </MerchantCard>
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1 space-y-4 sm:space-y-6">
              {/* Customer Info */}
              <MerchantCard>
                <MerchantCardHeader>
                  <MerchantCardTitle className="text-white text-base sm:text-lg">Customer Information</MerchantCardTitle>
                </MerchantCardHeader>
                <MerchantCardContent className="space-y-3 sm:space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-[#FF1493] via-[#DC143C] to-[#E97451] flex items-center justify-center flex-shrink-0">
                      <User className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-white font-semibold text-sm sm:text-base break-words">{redemption.customerName}</p>
                      <p className="text-xs sm:text-sm text-gray-400 flex items-center gap-1 break-all">
                        <Mail className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">{redemption.customerEmail}</span>
                      </p>
                    </div>
                  </div>
                </MerchantCardContent>
              </MerchantCard>

              {/* Timeline */}
              <MerchantCard>
                <MerchantCardHeader>
                  <MerchantCardTitle className="text-white flex items-center gap-2 text-base sm:text-lg">
                    <Calendar className="w-4 h-4 sm:w-5 sm:h-5" />
                    Timeline
                  </MerchantCardTitle>
                </MerchantCardHeader>
                <MerchantCardContent className="space-y-3 sm:space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-[#FF1493] mt-2 flex-shrink-0"></div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs sm:text-sm font-semibold text-white">Redeemed</p>
                      <p className="text-xs text-gray-400 break-words">
                        {new Date(redemption.redeemedAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  {(redemption.status === 'approved' || redemption.status === 'fulfilled') && (
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 rounded-full bg-green-500 mt-2 flex-shrink-0"></div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs sm:text-sm font-semibold text-white">
                          {redemption.status === 'fulfilled' ? 'Fulfilled' : 'Approved'}
                        </p>
                        {redemption.updatedAt && (
                          <p className="text-xs text-gray-400 break-words">
                            {new Date(redemption.updatedAt).toLocaleString()}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </MerchantCardContent>
              </MerchantCard>

              {/* Status Info */}
              <MerchantCard>
                <MerchantCardHeader>
                  <MerchantCardTitle className="text-white text-base sm:text-lg">Status Information</MerchantCardTitle>
                </MerchantCardHeader>
                <MerchantCardContent className="space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <span className="text-xs sm:text-sm text-gray-400">Current Status</span>
                    <div className="flex justify-start sm:justify-end">
                      {getStatusBadge(redemption.status)}
                    </div>
                  </div>
                  <div className="pt-3 border-t border-[#FF1493]/20">
                    <p className="text-xs text-gray-400 mb-2">Status Guide</p>
                    <div className="space-y-2 text-xs">
                      <div className="flex items-start gap-2">
                        <div className="w-2 h-2 rounded-full bg-yellow-500 mt-1.5 flex-shrink-0"></div>
                        <span className="text-gray-300 break-words">Pending - Awaiting approval</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5 flex-shrink-0"></div>
                        <span className="text-gray-300 break-words">Approved - Ready for fulfillment</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 flex-shrink-0"></div>
                        <span className="text-gray-300 break-words">Fulfilled - Completed</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <div className="w-2 h-2 rounded-full bg-red-500 mt-1.5 flex-shrink-0"></div>
                        <span className="text-gray-300 break-words">Canceled - Cancelled redemption</span>
                      </div>
                    </div>
                  </div>
                </MerchantCardContent>
              </MerchantCard>
            </div>
          </div>
        </motion.div>

        {/* QR Code Scanner */}
        <QRCodeScannerSimple
          isOpen={isScannerOpen}
          onClose={() => setIsScannerOpen(false)}
        />
      </MerchantDashboardLayout>
    </>
  )
}

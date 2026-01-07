import React from 'react'
import { Head, Link, usePage } from '@inertiajs/react'
import { MerchantCard, MerchantCardContent, MerchantCardHeader, MerchantCardTitle } from '@/components/merchant-ui'
import { MerchantButton } from '@/components/merchant-ui'
import { MerchantBadge } from '@/components/merchant-ui'
import { MerchantDashboardLayout } from '@/components/merchant'
import { ArrowLeft, CheckCircle2, Clock, XCircle, Calendar, Gift, DollarSign, User, Mail, Hash } from 'lucide-react'
import { motion } from 'framer-motion'

interface Props {
  redemptionId: string
}

export default function RedemptionShow({ redemptionId }: Props) {
  // Mock data - replace with actual data from backend
  const redemption = {
    id: redemptionId,
    offerTitle: 'Wireless Earbuds',
    customerName: 'Alice Smith',
    customerEmail: 'alice@example.com',
    pointsUsed: 10000,
    cashPaid: 25,
    status: 'completed' as 'pending' | 'completed' | 'cancelled',
    redeemedAt: '2024-01-20T10:30:00Z',
    code: 'RED-2024-001',
    qrCode: '/placeholder.jpg',
    notes: 'Customer redeemed in-store. Product delivered successfully.'
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <MerchantBadge className="bg-green-600/30 text-green-400 border-green-600/50 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            Completed
          </MerchantBadge>
        )
      case 'pending':
        return (
          <MerchantBadge className="bg-yellow-600/30 text-yellow-400 border-yellow-600/50 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Pending
          </MerchantBadge>
        )
      case 'cancelled':
        return (
          <MerchantBadge className="bg-red-600/30 text-red-400 border-red-600/50 flex items-center gap-1">
            <XCircle className="w-3 h-3" />
            Cancelled
          </MerchantBadge>
        )
      default:
        return <MerchantBadge>{status}</MerchantBadge>
    }
  }

  return (
    <>
      <Head title={`Redemption ${redemption.id} - Merchant Dashboard`} />
      <MerchantDashboardLayout>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-6 relative z-10"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <Link href="/redemptions">
              <MerchantButton variant="outline" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Redemptions
              </MerchantButton>
            </Link>
            {getStatusBadge(redemption.status)}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Redemption Details */}
              <MerchantCard>
                <MerchantCardHeader>
                  <MerchantCardTitle className="text-white">Redemption Details</MerchantCardTitle>
                </MerchantCardHeader>
                <MerchantCardContent className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-2">{redemption.offerTitle}</h2>
                    <p className="text-gray-400">Redemption ID: {redemption.id}</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-[#FF1493]/20">
                    <div className="flex items-center gap-3 p-3 bg-gradient-to-br from-[#FF1493]/10 via-[#DC143C]/10 to-[#E97451]/10 rounded-lg border border-[#FF1493]/20">
                      <Gift className="w-5 h-5 text-[#FF1493]" />
                      <div>
                        <p className="text-xs text-gray-400">Points Used</p>
                        <p className="text-lg font-bold text-white">{redemption.pointsUsed.toLocaleString()}</p>
                      </div>
                    </div>
                    {redemption.cashPaid && (
                      <div className="flex items-center gap-3 p-3 bg-gradient-to-br from-[#FF1493]/10 via-[#DC143C]/10 to-[#E97451]/10 rounded-lg border border-[#FF1493]/20">
                        <DollarSign className="w-5 h-5 text-[#FF1493]" />
                        <div>
                          <p className="text-xs text-gray-400">Cash Paid</p>
                          <p className="text-lg font-bold text-white">${redemption.cashPaid.toFixed(2)}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {redemption.code && (
                    <div className="p-4 bg-black/30 rounded-lg border border-[#FF1493]/20">
                      <div className="flex items-center gap-2 mb-2">
                        <Hash className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-400">Redemption Code</span>
                      </div>
                      <p className="text-xl font-mono font-bold text-[#FF1493]">{redemption.code}</p>
                    </div>
                  )}

                  {redemption.notes && (
                    <div>
                      <p className="text-sm font-semibold text-gray-400 mb-2">Notes</p>
                      <p className="text-gray-300">{redemption.notes}</p>
                    </div>
                  )}
                </MerchantCardContent>
              </MerchantCard>

              {/* QR Code */}
              {redemption.qrCode && (
                <MerchantCard>
                  <MerchantCardHeader>
                    <MerchantCardTitle className="text-white">QR Code</MerchantCardTitle>
                  </MerchantCardHeader>
                  <MerchantCardContent>
                    <div className="flex justify-center">
                      <div className="p-4 bg-white rounded-lg">
                        <img
                          src={redemption.qrCode}
                          alt="QR Code"
                          className="w-48 h-48"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/placeholder.jpg'
                          }}
                        />
                      </div>
                    </div>
                  </MerchantCardContent>
                </MerchantCard>
              )}
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1 space-y-6">
              {/* Customer Info */}
              <MerchantCard>
                <MerchantCardHeader>
                  <MerchantCardTitle className="text-white">Customer Information</MerchantCardTitle>
                </MerchantCardHeader>
                <MerchantCardContent className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#FF1493] via-[#DC143C] to-[#E97451] flex items-center justify-center">
                      <User className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-white font-semibold">{redemption.customerName}</p>
                      <p className="text-sm text-gray-400">{redemption.customerEmail}</p>
                    </div>
                  </div>
                </MerchantCardContent>
              </MerchantCard>

              {/* Timeline */}
              <MerchantCard>
                <MerchantCardHeader>
                  <MerchantCardTitle className="text-white">Timeline</MerchantCardTitle>
                </MerchantCardHeader>
                <MerchantCardContent className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-[#FF1493] mt-2"></div>
                    <div>
                      <p className="text-sm font-semibold text-white">Redeemed</p>
                      <p className="text-xs text-gray-400">
                        {new Date(redemption.redeemedAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  {redemption.status === 'completed' && (
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 rounded-full bg-green-500 mt-2"></div>
                      <div>
                        <p className="text-sm font-semibold text-white">Completed</p>
                        <p className="text-xs text-gray-400">
                          {new Date(redemption.redeemedAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  )}
                </MerchantCardContent>
              </MerchantCard>

              {/* Actions */}
              {redemption.status === 'pending' && (
                <MerchantCard>
                  <MerchantCardHeader>
                    <MerchantCardTitle className="text-white">Actions</MerchantCardTitle>
                  </MerchantCardHeader>
                  <MerchantCardContent className="space-y-3">
                    <MerchantButton className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800">
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Mark as Completed
                    </MerchantButton>
                    <MerchantButton variant="outline" className="w-full text-red-400 hover:text-red-300 border-red-500/50">
                      <XCircle className="w-4 h-4 mr-2" />
                      Cancel Redemption
                    </MerchantButton>
                  </MerchantCardContent>
                </MerchantCard>
              )}
            </div>
          </div>
        </motion.div>
      </MerchantDashboardLayout>
    </>
  )
}


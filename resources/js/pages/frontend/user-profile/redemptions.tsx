"use client"

import React, { useState } from "react"
import { Head, router } from "@inertiajs/react"
import ProfileLayout from "@/components/frontend/layout/user-profile-layout"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/frontend/ui/card"
import { Badge } from "@/components/frontend/ui/badge"
import { Button } from "@/components/frontend/ui/button"
import { 
  QrCode,
  Calendar,
  MapPin,
  Gift,
  CheckCircle,
  Clock,
  XCircle,
  Download,
  Eye,
  Image as ImageIcon,
  DollarSign,
} from "lucide-react"
import { cn } from "@/lib/utils"
import QRCodeModal from "@/components/frontend/QRCodeModal"

interface Redemption {
  id: number
  receipt_code: string
  points_spent: number
  cash_spent: number | null
  status: 'pending' | 'approved' | 'fulfilled' | 'canceled'
  used_at: string | null
  created_at: string
  qr_code_url: string
  verification_url: string
  pricingBreakdown?: {
    regularPrice: number
    discountPercentage: number
    discountAmount: number
    discountPrice: number
  } | null
  offer: {
    id: number
    title: string
    image_url: string | null
    cash_required?: number | null
    discount_percentage?: number | null
    merchant: {
      id: number
      name: string
    }
    category: {
      id: number
      name: string
    } | null
  }
  eligible_item: {
    id: number
    item_name: string
  } | null
}

interface PaginationData {
  current_page: number
  last_page: number
  per_page: number
  total: number
  from?: number
  to?: number
  links: Array<{
    url: string | null
    label: string
    active: boolean
  }>
}

interface PageProps {
  redemptions: {
    data: Redemption[]
  } & PaginationData
  filters: {
    per_page: number
    page: number
  }
}

export default function Redemptions({ redemptions, filters }: PageProps) {
  const [selectedRedemption, setSelectedRedemption] = useState<Redemption | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: 'Pending', className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400', icon: Clock },
      approved: { label: 'Approved', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400', icon: CheckCircle },
      fulfilled: { label: 'Fulfilled', className: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400', icon: CheckCircle },
      canceled: { label: 'Canceled', className: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400', icon: XCircle },
    }

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending
    const Icon = config.icon

    return (
      <Badge className={cn("flex items-center gap-1.5", config.className)}>
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    )
  }

  const handleQRCodeClick = (redemption: Redemption) => {
    setSelectedRedemption(redemption)
    setIsModalOpen(true)
  }

  return (
    <ProfileLayout title="Redemptions" description="View and manage your merchant offer redemptions">
      <Head title="Redemptions" />
      
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Redemptions</h1>
          <p className="text-gray-600 dark:text-gray-400">
            View all your merchant offer redemptions and QR codes
          </p>
        </div>

        {/* Redemptions List */}
        {redemptions.data.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Gift className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                No Redemptions Yet
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                You haven't redeemed any merchant offers yet.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {redemptions.data.map((redemption) => (
              <Card key={redemption.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    {/* Left: Offer Info */}
                    <div className="flex-1 space-y-3">
                      <div className="flex items-start gap-4">
                        <div className="relative w-20 h-20 flex-shrink-0">
                          {redemption.offer.image_url ? (
                            <img
                              src={redemption.offer.image_url}
                              alt={redemption.offer.title}
                              className="w-20 h-20 rounded-lg object-cover"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                const placeholder = e.currentTarget.nextElementSibling as HTMLElement;
                                if (placeholder) placeholder.style.display = 'flex';
                              }}
                            />
                          ) : null}
                          <div 
                            className={`w-20 h-20 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center ${redemption.offer.image_url ? 'hidden' : 'flex'}`}
                            style={{ display: redemption.offer.image_url ? 'none' : 'flex' }}
                          >
                            <Gift className="h-10 w-10 text-white" />
                          </div>
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                            {redemption.offer.title}
                          </h3>
                          <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                            <span className="flex items-center gap-1">
                              <MapPin className="h-4 w-4" />
                              {redemption.offer.merchant.name}
                            </span>
                            {redemption.offer.category && (
                              <>
                                <span>•</span>
                                <span>{redemption.offer.category.name}</span>
                              </>
                            )}
                          </div>
                          <div className="flex items-center gap-4 mt-2">
                            {getStatusBadge(redemption.status)}
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              Code: <span className="font-mono font-semibold">{redemption.receipt_code}</span>
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Details */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2 border-t border-gray-200 dark:border-gray-700">
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Points Spent</p>
                          <p className="text-sm font-semibold text-gray-900 dark:text-white">
                            {redemption.points_spent.toLocaleString()}
                          </p>
                        </div>
                        {redemption.pricingBreakdown ? (
                          <>
                            <div>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Regular Price</p>
                              <p className="text-sm font-semibold text-gray-900 dark:text-white line-through">
                                ${redemption.pricingBreakdown.regularPrice.toFixed(2)}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Discount ({redemption.pricingBreakdown.discountPercentage}%)</p>
                              <p className="text-sm font-semibold text-green-600 dark:text-green-400">
                                -${redemption.pricingBreakdown.discountAmount.toFixed(2)}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                                {redemption.status === 'fulfilled' || redemption.used_at ? 'You Paid' : 'Discounted Price'}
                              </p>
                              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                ${redemption.pricingBreakdown.discountPrice.toFixed(2)}
                              </p>
                            </div>
                          </>
                        ) : redemption.cash_spent && Number(redemption.cash_spent) > 0 ? (
                          <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                              {redemption.status === 'fulfilled' || redemption.used_at ? 'You Paid' : 'Discounted Price'}
                            </p>
                            <p className="text-sm font-semibold text-gray-900 dark:text-white">
                              ${Number(redemption.cash_spent).toFixed(2)}
                            </p>
                          </div>
                        ) : null}
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Redeemed</p>
                          <p className="text-sm font-semibold text-gray-900 dark:text-white">
                            {formatDate(redemption.created_at)}
                          </p>
                        </div>
                        {redemption.used_at && (
                          <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Used</p>
                            <p className="text-sm font-semibold text-gray-900 dark:text-white">
                              {formatDate(redemption.used_at)}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right: QR Code Button */}
                    <div className="flex flex-col items-end gap-2">
                      <Button
                        onClick={() => handleQRCodeClick(redemption)}
                        variant="outline"
                        size="lg"
                        className="flex items-center gap-2"
                      >
                        <QrCode className="h-5 w-5" />
                        View QR Code
                      </Button>
                      {redemption.status === 'fulfilled' && (
                        <Badge className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Used
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Pagination */}
        {redemptions.last_page > 1 && (
          <div className="flex items-center justify-center gap-2">
            <Button
              variant="outline"
              disabled={redemptions.current_page === 1}
              onClick={() => {
                const prevPage = redemptions.current_page - 1
                router.get(`/profile/redemptions?page=${prevPage}`)
              }}
            >
              Previous
            </Button>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Page {redemptions.current_page} of {redemptions.last_page}
            </span>
            <Button
              variant="outline"
              disabled={redemptions.current_page === redemptions.last_page}
              onClick={() => {
                const nextPage = redemptions.current_page + 1
                router.get(`/profile/redemptions?page=${nextPage}`)
              }}
            >
              Next
            </Button>
          </div>
        )}
      </div>

      {/* QR Code Modal */}
      {selectedRedemption && (
        <QRCodeModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false)
            setSelectedRedemption(null)
          }}
          qrCodeUrl={selectedRedemption.qr_code_url}
          receiptCode={selectedRedemption.receipt_code}
          offerTitle={selectedRedemption.offer.title}
          merchantName={selectedRedemption.offer.merchant.name}
        />
      )}
    </ProfileLayout>
  )
}

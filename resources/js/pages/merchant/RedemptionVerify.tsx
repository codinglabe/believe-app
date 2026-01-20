"use client"

import React, { useState, useEffect } from "react"
import { Head, router } from "@inertiajs/react"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  CheckCircle, 
  XCircle, 
  User, 
  Mail, 
  Calendar,
  Gift,
  DollarSign,
  AlertCircle,
  Loader2,
  QrCode,
} from "lucide-react"
import { MerchantDashboardLayout } from '@/components/merchant'
import { showSuccessToast, showErrorToast } from "@/lib/toast"

interface EligibleItem {
  id: number
  item_name: string
  description: string
  price: number
  discount_cap: number
  has_reached_limit: boolean
}

interface RedemptionData {
  id: number
  code: string
  user_name: string
  user_email: string
  points_spent: number
  cash_spent: number | null
  status: string
  discount_percentage: number
  discount_cap: number | null
  eligible_items: EligibleItem[]
  redeemed_at: string
}

interface PageProps {
  code: string
  redemption?: RedemptionData
  error?: string
  merchant?: {
    id: number
    name: string
  }
}

export default function RedemptionVerify({ code, redemption, error, merchant }: PageProps) {
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null)
  const [discountAmount, setDiscountAmount] = useState<string>("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [isLoading, setIsLoading] = useState(!redemption && !error)

  useEffect(() => {
    if (!redemption && !error) {
      // Fetch redemption data
      fetch(`/redemption/verify/${code}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.redemption) {
            router.reload({ only: ['redemption'] })
          } else {
            router.reload({ only: ['error'] })
          }
          setIsLoading(false)
        })
        .catch((err) => {
          console.error('Error fetching redemption:', err)
          setIsLoading(false)
        })
    }
  }, [code, redemption, error])

  const handleMarkAsUsed = async () => {
    if (isProcessing) return

    setIsProcessing(true)

    try {
      const response = await fetch(`/merchant-hub/redemption/${code}/mark-used`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
        },
        body: JSON.stringify({
          eligible_item_id: selectedItemId,
          discount_amount: discountAmount ? parseFloat(discountAmount) : null,
        }),
      })

      const data = await response.json()

      if (data.success) {
        showSuccessToast('Redemption marked as used successfully!')
        setTimeout(() => {
          router.visit('/merchant/redemptions')
        }, 1500)
      } else {
        showErrorToast(data.error || 'Failed to mark redemption as used')
        setIsProcessing(false)
      }
    } catch (err) {
      showErrorToast('An error occurred. Please try again.')
      setIsProcessing(false)
    }
  }

  if (isLoading) {
    return (
      <MerchantDashboardLayout>
        <Head title="Verify Redemption" />
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
        </div>
      </MerchantDashboardLayout>
    )
  }

  if (error || !redemption) {
    return (
      <MerchantDashboardLayout>
        <Head title="Redemption Not Found" />
        <div className="container mx-auto px-4 py-8">
          <Card className="max-w-2xl mx-auto">
            <CardContent className="p-8 text-center">
              <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Redemption Not Found
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                {error || 'The redemption code you scanned is invalid or has expired.'}
              </p>
              <Button onClick={() => router.visit('/merchant/redemptions')}>
                Back to Redemptions
              </Button>
            </CardContent>
          </Card>
        </div>
      </MerchantDashboardLayout>
    )
  }

  const isUsed = redemption.status === 'fulfilled'
  const canMarkAsUsed = !isUsed && redemption.status === 'approved'

  return (
    <MerchantDashboardLayout>
      <Head title="Verify Redemption" />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header */}
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", duration: 0.5 }}
              className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 mb-4"
            >
              <QrCode className="h-10 w-10 text-white" />
            </motion.div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Redemption Verification
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Verify and process this redemption
            </p>
          </div>

          {/* Status Badge */}
          <div className="flex justify-center">
            <Badge
              className={`text-lg px-4 py-2 ${
                isUsed
                  ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                  : redemption.status === 'approved'
                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
                  : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
              }`}
            >
              {isUsed ? (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Already Used
                </>
              ) : (
                <>
                  <AlertCircle className="h-4 w-4 mr-2" />
                  {redemption.status.charAt(0).toUpperCase() + redemption.status.slice(1)}
                </>
              )}
            </Badge>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* User Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  User Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Name</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    {redemption.user_name}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Email</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    {redemption.user_email}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Redemption Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gift className="h-5 w-5" />
                  Redemption Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Redemption Code</p>
                  <p className="text-lg font-mono font-semibold text-gray-900 dark:text-white">
                    {redemption.code}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Points Spent</p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">
                      {redemption.points_spent.toLocaleString()}
                    </p>
                  </div>
                  {redemption.cash_spent && redemption.cash_spent > 0 && (
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Cash Spent</p>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">
                        ${redemption.cash_spent.toFixed(2)}
                      </p>
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Discount</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    {redemption.discount_percentage}%
                    {redemption.discount_cap && ` (up to $${redemption.discount_cap.toFixed(2)})`}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Redeemed At</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {new Date(redemption.redeemed_at).toLocaleString()}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Eligible Items (if any) */}
          {redemption.eligible_items && redemption.eligible_items.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Eligible Items</CardTitle>
                <CardDescription>
                  Select the item that was redeemed (optional)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {redemption.eligible_items.map((item) => (
                    <label
                      key={item.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                        selectedItemId === item.id
                          ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                      } ${item.has_reached_limit ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <input
                        type="radio"
                        name="eligible_item"
                        value={item.id}
                        checked={selectedItemId === item.id}
                        onChange={() => !item.has_reached_limit && setSelectedItemId(item.id)}
                        disabled={item.has_reached_limit}
                        className="w-4 h-4 text-purple-600"
                      />
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900 dark:text-white">
                          {item.item_name}
                        </p>
                        {item.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {item.description}
                          </p>
                        )}
                        <div className="flex items-center gap-4 mt-1">
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            Price: ${item.price.toFixed(2)}
                          </span>
                          {item.has_reached_limit && (
                            <Badge variant="destructive" className="text-xs">
                              Limit Reached
                            </Badge>
                          )}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Discount Amount (optional) */}
          {canMarkAsUsed && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Discount Amount (Optional)
                </CardTitle>
                <CardDescription>
                  Enter the actual discount amount applied
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={discountAmount}
                    onChange={(e) => setDiscountAmount(e.target.value)}
                    placeholder="0.00"
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex gap-4 justify-center">
            <Button
              variant="outline"
              onClick={() => router.visit('/merchant/redemptions')}
            >
              Back
            </Button>
            {canMarkAsUsed && (
              <Button
                onClick={handleMarkAsUsed}
                disabled={isProcessing}
                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Mark as Used
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </MerchantDashboardLayout>
  )
}

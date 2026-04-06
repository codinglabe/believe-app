"use client"

import React, { useState } from "react"
import { Head, router, usePage } from "@inertiajs/react"
import ProfileLayout from "@/components/frontend/layout/user-profile-layout"
import AppSidebarLayout from "@/layouts/app/app-sidebar-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Coins, RefreshCw, CheckCircle2, AlertCircle, XCircle, Clock, Receipt } from "lucide-react"
import { showSuccessToast, showErrorToast } from "@/lib/toast"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface Purchase {
  id: number
  amount: string
  points: string
  created_at: string
  can_refund: boolean
  reason: string | null
}

interface RefundHistoryItem {
  id: number
  amount: string
  points: string
  created_at: string
  refunded_at: string
  refund_status: string | null
  stripe_refund_id: string | null
}

interface PageProps {
  currentBalance: number
  purchases: Purchase[]
  refundHistory: RefundHistoryItem[]
  flash?: {
    success?: string
    error?: string
  }
}

export default function BelievePointsRefunds({
  currentBalance,
  purchases,
  refundHistory
}: PageProps) {
  const { flash, auth } = usePage().props as any
  const isSupporter = auth?.user?.role === 'user' || !auth?.user?.role
  const [refundingId, setRefundingId] = useState<number | null>(null)
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false)
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null)

  const formatCurrency = (value: number | string): string => {
    const num = typeof value === 'string' ? parseFloat(value) : value
    if (isNaN(num)) return "$0.00"
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num)
  }

  const formatPoints = (value: number | string): string => {
    const num = typeof value === 'string' ? parseFloat(value) : value
    if (isNaN(num)) return "0"
    return new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(num)
  }

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const handleRefundClick = (purchase: Purchase) => {
    setSelectedPurchase(purchase)
    setConfirmDialogOpen(true)
  }

  const handleConfirmRefund = () => {
    if (!selectedPurchase) return

    setRefundingId(selectedPurchase.id)
    setConfirmDialogOpen(false)

    router.post(
      route("believe-points.refund", selectedPurchase.id),
      {},
      {
        onSuccess: (page) => {
          // Check if there's a flash error message
          if (page.props.flash?.error) {
            showErrorToast(page.props.flash.error)
          } else if (page.props.flash?.success) {
            showSuccessToast(page.props.flash.success)
          } else {
            showSuccessToast("Refund processed successfully")
          }
          setRefundingId(null)
          setSelectedPurchase(null)
          // Reload the page to refresh the purchase list and refund history
          router.reload({ only: ['purchases', 'currentBalance', 'refundHistory'] })
        },
        onError: (errors) => {
          const errorMessage = errors.error || errors.message || "Failed to process refund"
          showErrorToast(errorMessage)
          setRefundingId(null)
          setSelectedPurchase(null)
        },
        onFinish: () => {
          setRefundingId(null)
        },
      }
    )
  }

  const refundablePurchases = purchases.filter(p => p.can_refund)
  const nonRefundablePurchases = purchases.filter(p => !p.can_refund)

  const content = (
    <>
      {/* Success/Error Messages */}
      {flash?.success && (
        <Alert className="bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <AlertDescription className="text-emerald-800 dark:text-emerald-200">
            {flash.success}
          </AlertDescription>
        </Alert>
      )}

      {flash?.error && (
        <Alert className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800 dark:text-red-200">
            {flash.error}
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-6">
        {/* Current Balance Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Coins className="h-5 w-5" />
              Your Believe Points Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-6">
              <div className="text-5xl font-bold text-primary mb-2">
                {formatPoints(currentBalance)}
              </div>
              <p className="text-sm text-muted-foreground">
                {formatCurrency(currentBalance)} worth of Believe Points
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Refund Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              Refund Policy
            </CardTitle>
            <CardDescription>
              You can refund Believe Points purchases within 7 days, but only if you still have those points in your balance.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 space-y-2">
              <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100">Refund Requirements:</h4>
              <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1 list-disc list-inside">
                <li>Purchase must be within 7 days</li>
                <li>You must still have the purchased points in your balance</li>
                <li>Refund will be processed to your original payment method</li>
                <li>Points will be deducted from your balance immediately</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Refundable Purchases */}
        {refundablePurchases.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                Refundable Purchases
              </CardTitle>
              <CardDescription>
                These purchases can be refunded. Click the refund button to process.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {refundablePurchases.map((purchase) => (
                  <div
                    key={purchase.id}
                    className="border rounded-lg p-4 space-y-3 bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Coins className="h-4 w-4 text-primary" />
                        <span className="font-semibold text-lg">
                          {formatPoints(purchase.points)} Points
                        </span>
                      </div>
                      <Badge variant="default" className="bg-green-600">
                        Refundable
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <div className="space-y-1">
                        <p className="text-muted-foreground">
                          Amount: <span className="font-semibold">{formatCurrency(purchase.amount)}</span>
                        </p>
                        <p className="text-muted-foreground">
                          Purchased: {formatDate(purchase.created_at)}
                        </p>
                      </div>
                    </div>
                    <Button
                      onClick={() => handleRefundClick(purchase)}
                      disabled={refundingId === purchase.id}
                      className="w-full"
                      variant="outline"
                    >
                      {refundingId === purchase.id ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Processing Refund...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Request Refund
                        </>
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Non-Refundable Purchases */}
        {nonRefundablePurchases.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <XCircle className="h-5 w-5 text-gray-500" />
                Non-Refundable Purchases
              </CardTitle>
              <CardDescription>
                These purchases cannot be refunded. They may be outside the 7-day window, already refunded, or you no longer have the points in your balance.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {nonRefundablePurchases.map((purchase) => (
                  <div
                    key={purchase.id}
                    className="border rounded-lg p-4 space-y-3 bg-gray-50 dark:bg-gray-900/10 border-gray-200 dark:border-gray-800"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Coins className="h-4 w-4 text-muted-foreground" />
                        <span className="font-semibold">
                          {formatPoints(purchase.points)} Points
                        </span>
                      </div>
                      <Badge variant="secondary">
                        Not Refundable
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <div className="space-y-1">
                        <p className="text-muted-foreground">
                          Amount: <span className="font-semibold">{formatCurrency(purchase.amount)}</span>
                        </p>
                        <p className="text-muted-foreground">
                          Purchased: {formatDate(purchase.created_at)}
                        </p>
                        {purchase.reason && (
                          <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1 mt-1">
                            <AlertCircle className="h-3 w-3" />
                            {purchase.reason}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* No Purchases */}
        {purchases.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-semibold mb-2">No Recent Purchases</p>
              <p className="text-sm text-muted-foreground">
                You don't have any purchases within the last 7 days that are eligible for refund.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Refund History */}
        {refundHistory.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5 text-blue-600" />
                Refund History
              </CardTitle>
              <CardDescription>
                History of all your refunded Believe Points purchases.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {refundHistory.map((refund) => (
                  <div
                    key={refund.id}
                    className="border rounded-lg p-4 space-y-3 bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <RefreshCw className="h-4 w-4 text-blue-600" />
                        <span className="font-semibold text-lg">
                          {formatPoints(refund.points)} Points
                        </span>
                      </div>
                      <Badge
                        variant={refund.refund_status === 'succeeded' ? 'default' : 'secondary'}
                        className={refund.refund_status === 'succeeded' ? 'bg-green-600' : ''}
                      >
                        {refund.refund_status === 'succeeded' ? 'Refunded' : refund.refund_status || 'Processing'}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      <div className="space-y-1">
                        <p className="text-muted-foreground">
                          <span className="font-semibold">Amount:</span> {formatCurrency(refund.amount)}
                        </p>
                        <p className="text-muted-foreground">
                          <span className="font-semibold">Purchased:</span> {formatDate(refund.created_at)}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-muted-foreground">
                          <span className="font-semibold">Refunded:</span> {formatDate(refund.refunded_at)}
                        </p>
                        {refund.stripe_refund_id && (
                          <p className="text-muted-foreground">
                            <span className="font-semibold">Refund ID:</span>{" "}
                            <span className="font-mono text-xs">{refund.stripe_refund_id}</span>
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="pt-2 border-t border-blue-200 dark:border-blue-800">
                      <p className="text-xs text-blue-700 dark:text-blue-300">
                        <CheckCircle2 className="h-3 w-3 inline mr-1" />
                        Refund processed to your original payment method. It may take 5-10 business days to appear in your account.
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* No Refund History */}
        {refundHistory.length === 0 && purchases.length > 0 && (
          <Card>
            <CardContent className="py-8 text-center">
              <Receipt className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm font-semibold mb-1">No Refund History</p>
              <p className="text-xs text-muted-foreground">
                You haven't refunded any purchases yet.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Refund Confirmation Dialog */}
      <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Refund</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedPurchase && (
                <>
                  Are you sure you want to refund this purchase?
                  <div className="mt-4 p-3 bg-muted rounded-lg space-y-2">
                    <p className="font-semibold">
                      {formatPoints(selectedPurchase.points)} Believe Points
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Amount: {formatCurrency(selectedPurchase.amount)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Purchased: {formatDate(selectedPurchase.created_at)}
                    </p>
                  </div>
                  <p className="mt-4 text-sm">
                    The refund will be processed to your original payment method and {formatPoints(selectedPurchase.points)} points will be deducted from your balance.
                  </p>
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmRefund}>
              Confirm Refund
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )

  if (isSupporter) {
    return (
      <>
        <Head title="Refund Believe Points" />
        <ProfileLayout title="Refund Believe Points" description="Refund your Believe Points purchases within 7 days">
          {content}
        </ProfileLayout>
      </>
    )
  }

  // For organizations and admins, use AppSidebarLayout
  return (
    <AppSidebarLayout>
      <Head title="Refund Believe Points" />
      <div className="m-3 md:m-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Refund Believe Points</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Refund your Believe Points purchases within 7 days
          </p>
        </div>
        {content}
      </div>
    </AppSidebarLayout>
  )
}


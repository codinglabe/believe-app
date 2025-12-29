"use client"

import React, { useState, FormEvent } from "react"
import { Head, router, usePage } from "@inertiajs/react"
import ProfileLayout from "@/components/frontend/layout/user-profile-layout"
import AppSidebarLayout from "@/layouts/app/app-sidebar-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Coins, DollarSign, ArrowRight, CheckCircle2, AlertCircle, History, TrendingUp } from "lucide-react"
import { showSuccessToast, showErrorToast } from "@/lib/toast"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { cn } from "@/lib/utils"
import { route } from "ziggy-js"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Separator } from "@/components/ui/separator"

interface Purchase {
  id: number
  amount: string
  points: string
  status: string
  created_at: string
}

interface PageProps {
  currentBalance: number
  minPurchaseAmount: number
  maxPurchaseAmount: number
  purchases: {
    data: Purchase[]
    links: any
    meta: any
  }
  flash?: {
    success?: string
    error?: string
  }
}

export default function BelievePointsIndex({
  currentBalance,
  minPurchaseAmount,
  maxPurchaseAmount,
  purchases
}: PageProps) {
  const { flash, auth } = usePage().props as any
  const isSupporter = auth?.user?.role === 'user' || !auth?.user?.role
  const [formData, setFormData] = useState({
    amount: "",
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleChange = (value: string) => {
    // Allow only numbers and one decimal point
    const numericValue = value.replace(/[^0-9.]/g, '')
    // Ensure only one decimal point
    const parts = numericValue.split('.')
    const formattedValue = parts.length > 2
      ? parts[0] + '.' + parts.slice(1).join('')
      : numericValue

    setFormData({ amount: formattedValue })

    // Clear error
    if (errors.amount) {
      setErrors({})
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}
    const amount = parseFloat(formData.amount)

    if (!formData.amount || isNaN(amount) || amount < minPurchaseAmount) {
      newErrors.amount = `Minimum purchase amount is $${minPurchaseAmount.toFixed(2)}`
    }
    if (amount > maxPurchaseAmount) {
      newErrors.amount = `Maximum purchase amount is $${maxPurchaseAmount.toFixed(2)}`
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      showErrorToast("Please fix the errors before submitting")
      return
    }

    setIsSubmitting(true)

    router.post(
      route("believe-points.purchase"),
      {
        amount: parseFloat(formData.amount),
      },
      {
        onError: (errors) => {
          setErrors(errors as Record<string, string>)
          showErrorToast("Failed to process purchase. Please check the errors.")
          setIsSubmitting(false)
        },
        onFinish: () => {
          setIsSubmitting(false)
        },
      }
    )
  }

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

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      completed: 'default',
      pending: 'secondary',
      failed: 'destructive',
      cancelled: 'destructive',
    }
    return (
      <Badge variant={variants[status] || 'secondary'}>
        {status}
      </Badge>
    )
  }

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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Purchase Form */}
          <div className="lg:col-span-2 space-y-6">
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

            {/* Purchase Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Purchase Believe Points
                </CardTitle>
                <CardDescription>
                  Enter the amount you want to spend. You'll receive the same amount in Believe Points (1:1 ratio).
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="amount" className="text-base font-semibold">
                      Purchase Amount
                    </Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                      <Input
                        id="amount"
                        type="text"
                        value={formData.amount}
                        onChange={(e) => handleChange(e.target.value)}
                        className={cn(
                          "h-14 text-xl pl-10",
                          errors.amount && "border-red-500 focus-visible:ring-red-500"
                        )}
                        placeholder="0.00"
                        disabled={isSubmitting}
                      />
                    </div>
                    {errors.amount && (
                      <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                        <AlertCircle className="h-4 w-4" />
                        {errors.amount}
                      </p>
                    )}
                    <p className="text-sm text-muted-foreground">
                      Minimum: {formatCurrency(minPurchaseAmount)} • Maximum: {formatCurrency(maxPurchaseAmount)}
                    </p>
                  </div>

                  {formData.amount && !errors.amount && parseFloat(formData.amount) >= minPurchaseAmount && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                            You'll receive:
                          </p>
                          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
                            {formatPoints(parseFloat(formData.amount))} Believe Points
                          </p>
                        </div>
                        <Coins className="h-8 w-8 text-blue-600" />
                      </div>
                    </div>
                  )}

                  <Separator />

                  {/* Information */}
                  <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                    <h4 className="text-sm font-semibold">How it works:</h4>
                    <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                      <li>1 Believe Point = $1 USD (1:1 ratio)</li>
                      <li>Payment is processed securely through Stripe</li>
                      <li>Points are added to your account immediately after payment</li>
                      <li>You can use Believe Points to support causes and organizations</li>
                    </ul>
                  </div>

                  <Button
                    type="submit"
                    disabled={isSubmitting || !formData.amount || !!errors.amount}
                    className="w-full h-12 text-lg"
                    size="lg"
                  >
                    {isSubmitting ? (
                      <>
                        <span className="animate-spin mr-2">⏳</span>
                        Processing...
                      </>
                    ) : (
                      <>
                        Purchase Believe Points
                        <ArrowRight className="h-5 w-5 ml-2" />
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Purchase History */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Purchase History
                </CardTitle>
              </CardHeader>
              <CardContent>
                {purchases.data.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No purchases yet
                  </p>
                ) : (
                  <div className="space-y-4">
                    {purchases.data.map((purchase) => (
                      <div key={purchase.id} className="border rounded-lg p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Coins className="h-4 w-4 text-primary" />
                            <span className="font-semibold">{formatPoints(purchase.points)} Points</span>
                          </div>
                          {getStatusBadge(purchase.status)}
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">{formatCurrency(purchase.amount)}</span>
                          <span className="text-muted-foreground">
                            {new Date(purchase.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
    </>
  )

  if (isSupporter) {
    return (
      <>
        <Head title="Believe Points" />
        <ProfileLayout title="Believe Points" description="Purchase and manage your Believe Points. 1 Believe Point = $1 USD">
          {content}
        </ProfileLayout>
      </>
    )
  }

  // For organizations and admins, use AppSidebarLayout
  return (
    <AppSidebarLayout>
      <Head title="Believe Points" />
      <div className="m-3 md:m-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Believe Points</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Purchase Believe Points to support causes you care about. 1 Believe Point = $1 USD
          </p>
        </div>
        {content}
      </div>
    </AppSidebarLayout>
  )
}


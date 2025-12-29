"use client"

import React, { useState, FormEvent } from "react"
import { Head, router, usePage } from "@inertiajs/react"
import AppLayout from "@/layouts/app-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/admin/ui/switch"
import { Coins, Save, AlertCircle, CheckCircle2, DollarSign, TrendingUp, Users, History } from "lucide-react"
import type { BreadcrumbItem } from "@/types"
import { showSuccessToast, showErrorToast } from "@/lib/toast"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { cn } from "@/lib/utils"
import { route } from "ziggy-js"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

const breadcrumbs: BreadcrumbItem[] = [
  { title: "Dashboard", href: "/dashboard" },
  { title: "Believe Points Management", href: "#" },
]

interface Purchase {
  id: number
  user: {
    id: number
    name: string
    email: string
  }
  amount: string
  points: string
  status: string
  created_at: string
}

interface PageProps {
  settings: {
    enabled: boolean
    min_purchase_amount: number
    max_purchase_amount: number
  }
  statistics: {
    total_purchases: number
    total_revenue: number
    total_points_issued: number
  }
  recentPurchases: Purchase[]
  flash?: {
    success?: string
    error?: string
  }
}

export default function AdminBelievePointsIndex({ settings, statistics, recentPurchases }: PageProps) {
  const { flash } = usePage().props as any
  const [formData, setFormData] = useState({
    enabled: settings.enabled,
    min_purchase_amount: settings.min_purchase_amount.toString(),
    max_purchase_amount: settings.max_purchase_amount.toString(),
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleChange = (field: string, value: string | boolean) => {
    if (typeof value === 'boolean') {
      setFormData(prev => ({ ...prev, [field]: value }))
    } else {
      // Allow only numbers and one decimal point
      const numericValue = value.replace(/[^0-9.]/g, '')
      // Ensure only one decimal point
      const parts = numericValue.split('.')
      const formattedValue = parts.length > 2
        ? parts[0] + '.' + parts.slice(1).join('')
        : numericValue

      setFormData(prev => ({
        ...prev,
        [field]: formattedValue
      }))
    }

    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    const minAmount = parseFloat(formData.min_purchase_amount)
    const maxAmount = parseFloat(formData.max_purchase_amount)

    if (!formData.min_purchase_amount || isNaN(minAmount) || minAmount < 1) {
      newErrors.min_purchase_amount = "Minimum purchase amount must be at least $1"
    }
    if (!formData.max_purchase_amount || isNaN(maxAmount) || maxAmount < 1) {
      newErrors.max_purchase_amount = "Maximum purchase amount must be at least $1"
    }
    if (minAmount >= maxAmount) {
      newErrors.max_purchase_amount = "Maximum purchase amount must be greater than minimum"
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

    router.put(
      route("admin.believe-points.update"),
      {
        enabled: formData.enabled,
        min_purchase_amount: parseFloat(formData.min_purchase_amount),
        max_purchase_amount: parseFloat(formData.max_purchase_amount),
      },
      {
        onSuccess: () => {
          showSuccessToast("Believe Points settings updated successfully")
          setIsSubmitting(false)
        },
        onError: (errors) => {
          setErrors(errors as Record<string, string>)
          showErrorToast("Failed to update settings. Please check the errors.")
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

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title="Believe Points Management" />
      <div className="m-3 md:m-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Believe Points Management</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Configure the Believe Points system. 1 Believe Point = $1. Supporters and organizations can purchase Believe Points through Stripe.
          </p>
        </div>

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

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Purchases</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.total_purchases}</div>
              <p className="text-xs text-muted-foreground">Completed transactions</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(statistics.total_revenue)}</div>
              <p className="text-xs text-muted-foreground">From all purchases</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Points Issued</CardTitle>
              <Coins className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatPoints(statistics.total_points_issued)}</div>
              <p className="text-xs text-muted-foreground">Believe Points distributed</p>
            </CardContent>
          </Card>
        </div>

        {/* Settings Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Coins className="h-5 w-5" />
              Believe Points Settings
            </CardTitle>
            <CardDescription>
              Configure the Believe Points purchase system. Users can purchase Believe Points at a 1:1 ratio ($1 = 1 Believe Point).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Enable/Disable */}
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-0.5">
                  <Label htmlFor="enabled" className="text-base font-semibold">
                    Enable Believe Points
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Allow supporters and organizations to purchase Believe Points
                  </p>
                </div>
                <Switch
                  id="enabled"
                  checked={formData.enabled}
                  onCheckedChange={(checked) => handleChange("enabled", checked)}
                  disabled={isSubmitting}
                />
              </div>

              <Separator />

              {/* Purchase Limits */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="min_purchase_amount" className="text-base font-semibold">
                    Minimum Purchase Amount
                  </Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="min_purchase_amount"
                      type="text"
                      value={formData.min_purchase_amount}
                      onChange={(e) => handleChange("min_purchase_amount", e.target.value)}
                      className={cn(
                        "h-12 text-lg pl-10",
                        errors.min_purchase_amount && "border-red-500 focus-visible:ring-red-500"
                      )}
                      placeholder="1.00"
                      disabled={isSubmitting}
                    />
                  </div>
                  {errors.min_purchase_amount && (
                    <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                      <AlertCircle className="h-4 w-4" />
                      {errors.min_purchase_amount}
                    </p>
                  )}
                  <p className="text-sm text-muted-foreground">
                    Minimum amount users can spend to purchase Believe Points
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="max_purchase_amount" className="text-base font-semibold">
                    Maximum Purchase Amount
                  </Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="max_purchase_amount"
                      type="text"
                      value={formData.max_purchase_amount}
                      onChange={(e) => handleChange("max_purchase_amount", e.target.value)}
                      className={cn(
                        "h-12 text-lg pl-10",
                        errors.max_purchase_amount && "border-red-500 focus-visible:ring-red-500"
                      )}
                      placeholder="10000.00"
                      disabled={isSubmitting}
                    />
                  </div>
                  {errors.max_purchase_amount && (
                    <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                      <AlertCircle className="h-4 w-4" />
                      {errors.max_purchase_amount}
                    </p>
                  )}
                  <p className="text-sm text-muted-foreground">
                    Maximum amount users can spend in a single purchase
                  </p>
                </div>
              </div>

              <Separator />

              {/* Information Section */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
                  How It Works
                </h3>
                <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1 list-disc list-inside">
                  <li>1 Believe Point = $1 USD (1:1 ratio)</li>
                  <li>Users can purchase Believe Points through Stripe payment gateway</li>
                  <li>Points are added to user accounts immediately after successful payment</li>
                  <li>Both supporters and organizations can purchase Believe Points</li>
                  <li>Purchase history is tracked for all transactions</li>
                </ul>
              </div>

              {/* Submit Button */}
              <div className="flex justify-end pt-4">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="min-w-[120px]"
                >
                  {isSubmitting ? (
                    <>
                      <span className="animate-spin mr-2">⏳</span>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Settings
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Recent Purchases */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Recent Purchases
            </CardTitle>
            <CardDescription>
              Latest Believe Points purchase transactions
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recentPurchases.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No purchases yet
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Points</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentPurchases.map((purchase) => (
                    <TableRow key={purchase.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{purchase.user.name}</div>
                          <div className="text-sm text-muted-foreground">{purchase.user.email}</div>
                        </div>
                      </TableCell>
                      <TableCell>{formatCurrency(purchase.amount)}</TableCell>
                      <TableCell>{formatPoints(purchase.points)}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            purchase.status === 'completed' ? 'default' :
                            purchase.status === 'pending' ? 'secondary' :
                            'destructive'
                          }
                        >
                          {purchase.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(purchase.created_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}


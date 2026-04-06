"use client"

import AppLayout from "@/layouts/app-layout"
import { Head, router, useForm, usePage } from "@inertiajs/react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import {
  Settings,
  DollarSign,
  Percent,
  CreditCard,
  Sparkles,
  MapPin,
  Save,
  AlertCircle,
  CheckCircle2,
  Info,
  FileCheck,
} from "lucide-react"
import { showSuccessToast, showErrorToast } from "@/lib/toast"

interface State {
  id: number
  state: string
  state_code: string
  base_sales_tax_rate: number
  rate_mode: string | null
  sales_tax_status: string | null
  services_vs_goods: string | null
  charitable_vs_resale: string | null
  requires_exemption_certificate: boolean
  certificate_type_allowed: string | null
  site_to_apply_for_certificate: string | null
  local_rates_apply: boolean
  last_updated: string | null
  notes: string | null
}

interface PageProps {
  settings: {
    platform_fee_percentage: number
    stripe_transaction_fee_percentage: number
    believe_points_transaction_fee_percentage: number
    monthly_advertising_fee: number
  } | null
  states: State[]
  isAdmin: boolean
}

export default function ServiceHubSettings({ settings, states, certificates = [], isAdmin }: PageProps) {
  const [activeTab, setActiveTab] = useState(isAdmin ? "fees" : "taxes")
  const [editingStates, setEditingStates] = useState<Record<number, number>>({})
  const [bulkEditMode, setBulkEditMode] = useState(false)

  const { data: feeData, setData: setFeeData, post: postFees, processing: processingFees, errors: feeErrors } = useForm({
    platform_fee_percentage: settings?.platform_fee_percentage || 0,
    stripe_transaction_fee_percentage: settings?.stripe_transaction_fee_percentage || 0,
    believe_points_transaction_fee_percentage: settings?.believe_points_transaction_fee_percentage || 0,
    monthly_advertising_fee: settings?.monthly_advertising_fee || 0,
  })

  const handleFeeSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    postFees("/settings/service-hub/fees", {
      preserveScroll: true,
      onSuccess: () => {
        showSuccessToast("Fee settings updated successfully!")
      },
      onError: () => {
        showErrorToast("Failed to update fee settings. Please check the form.")
      },
    })
  }

  const handleStateTaxChange = (stateId: number, value: number) => {
    setEditingStates((prev) => ({
      ...prev,
      [stateId]: value,
    }))
  }

  const handleStateTaxUpdate = async (stateId: number) => {
    const newRate = editingStates[stateId]
    if (newRate === undefined) return

    router.post(
      `/settings/service-hub/state-tax/${stateId}`,
      { base_sales_tax_rate: newRate },
      {
        preserveScroll: true,
        onSuccess: () => {
          showSuccessToast("Sales tax rate updated successfully!")
          setEditingStates((prev) => {
            const updated = { ...prev }
            delete updated[stateId]
            return updated
          })
        },
        onError: () => {
          showErrorToast("Failed to update sales tax rate.")
        },
      }
    )
  }

  const handleBulkUpdate = async () => {
    const taxes = states.map((state) => ({
      id: state.id,
      base_sales_tax_rate: editingStates[state.id] ?? state.base_sales_tax_rate,
    }))

    router.post(
      "/settings/service-hub/state-taxes/bulk",
      { taxes },
      {
        preserveScroll: true,
        onSuccess: () => {
          showSuccessToast("Sales tax rates updated successfully!")
          setEditingStates({})
          setBulkEditMode(false)
        },
        onError: () => {
          showErrorToast("Failed to update sales tax rates.")
        },
      }
    )
  }

  const breadcrumbs = [
    { title: "Dashboard", href: "/dashboard" },
    { title: "Service Hub Settings", href: "/settings/service-hub" },
  ]


  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title="Service Hub Settings" />
      <div className="space-y-6 p-4 sm:p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Service Hub Settings</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1.5">
              Manage fees, transaction rates, and sales tax configurations
            </p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className={`grid w-full ${isAdmin ? 'grid-cols-2' : 'grid-cols-1'}`}>
            {isAdmin && <TabsTrigger value="fees">Fee Settings</TabsTrigger>}
            <TabsTrigger value="taxes">{isAdmin ? 'Sales Tax Rates' : 'State Sales Tax'}</TabsTrigger>
          </TabsList>

          {/* Fee Settings Tab - Admin Only */}
          {isAdmin && settings && (
            <TabsContent value="fees" className="space-y-6">
            {/* Fee Overview Card */}
            <Card className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border-blue-200 dark:border-blue-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Info className="h-5 w-5" />
                  Fee Structure Overview
                </CardTitle>
                <CardDescription>
                  Current fee configuration and how fees are calculated
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border">
                    <p className="text-sm text-muted-foreground mb-1">Platform Fee</p>
                    <p className="text-2xl font-bold">{feeData.platform_fee_percentage}%</p>
                    <p className="text-xs text-muted-foreground mt-1">Deducted from seller</p>
                  </div>
                  <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border">
                    <p className="text-sm text-muted-foreground mb-1">Stripe Fee</p>
                    <p className="text-2xl font-bold">{feeData.stripe_transaction_fee_percentage}%</p>
                    <p className="text-xs text-muted-foreground mt-1">For card payments</p>
                  </div>
                  <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border">
                    <p className="text-sm text-muted-foreground mb-1">Believe Points Fee</p>
                    <p className="text-2xl font-bold">{feeData.believe_points_transaction_fee_percentage}%</p>
                    <p className="text-xs text-muted-foreground mt-1">For points payments</p>
                  </div>
                  <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border">
                    <p className="text-sm text-muted-foreground mb-1">Monthly Ad Fee</p>
                    <p className="text-2xl font-bold">${feeData.monthly_advertising_fee.toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground mt-1">Per seller per month</p>
                  </div>
                </div>
                <div className="mt-4 p-4 bg-white dark:bg-gray-800 rounded-lg border">
                  <p className="text-sm font-semibold mb-2">Example Calculation (Order: $100)</p>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Order Amount:</span>
                      <span className="font-medium">$100.00</span>
                    </div>
                    <div className="flex justify-between text-red-600 dark:text-red-400">
                      <span>Platform Fee ({feeData.platform_fee_percentage}%):</span>
                      <span>-${((100 * feeData.platform_fee_percentage) / 100).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-red-600 dark:text-red-400">
                      <span>Transaction Fee ({feeData.stripe_transaction_fee_percentage}%):</span>
                      <span>-${((100 * feeData.stripe_transaction_fee_percentage) / 100).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t font-semibold">
                      <span>Seller Earnings:</span>
                      <span className="text-green-600 dark:text-green-400">
                        ${(100 - (100 * feeData.platform_fee_percentage) / 100 - (100 * feeData.stripe_transaction_fee_percentage) / 100).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Fee Configuration
                </CardTitle>
                <CardDescription>
                  Configure platform fees, transaction fees, and monthly advertising fees. Changes will apply to all new orders.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleFeeSubmit} className="space-y-6">
                  {/* Platform Fee */}
                  <div className="space-y-2 p-4 border rounded-lg bg-muted/50">
                    <Label htmlFor="platform_fee_percentage" className="flex items-center gap-2 text-base font-semibold">
                      <Percent className="h-5 w-5 text-blue-600" />
                      Platform Fee Percentage
                    </Label>
                    <div className="relative">
                      <Input
                        id="platform_fee_percentage"
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        value={feeData.platform_fee_percentage}
                        onChange={(e) => setFeeData("platform_fee_percentage", parseFloat(e.target.value) || 0)}
                        className="pr-8 text-lg font-semibold"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">%</span>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">
                        This percentage is deducted from the seller's earnings for each service order. This is the platform's commission.
                      </p>
                      <p className="text-xs text-muted-foreground">
                        <strong>Example:</strong> If set to 5.5%, and an order is $100, the seller pays $5.50 as platform fee.
                      </p>
                    </div>
                    {feeErrors.platform_fee_percentage && (
                      <p className="text-sm text-red-500">{feeErrors.platform_fee_percentage}</p>
                    )}
                  </div>

                  {/* Stripe Transaction Fee */}
                  <div className="space-y-2 p-4 border rounded-lg bg-muted/50">
                    <Label htmlFor="stripe_transaction_fee_percentage" className="flex items-center gap-2 text-base font-semibold">
                      <CreditCard className="h-5 w-5 text-green-600" />
                      Stripe Transaction Fee Percentage
                    </Label>
                    <div className="relative">
                      <Input
                        id="stripe_transaction_fee_percentage"
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        value={feeData.stripe_transaction_fee_percentage}
                        onChange={(e) =>
                          setFeeData("stripe_transaction_fee_percentage", parseFloat(e.target.value) || 0)
                        }
                        className="pr-8 text-lg font-semibold"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">%</span>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">
                        Transaction fee percentage applied when buyers pay using Stripe (credit/debit cards). This fee is deducted from the seller's earnings.
                      </p>
                      <p className="text-xs text-muted-foreground">
                        <strong>Example:</strong> If set to 3%, and an order is $100, the seller pays $3.00 as transaction fee.
                      </p>
                      <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                        💡 Tip: Believe Points payments have a lower transaction fee (see below) to encourage sellers to accept them.
                      </p>
                    </div>
                    {feeErrors.stripe_transaction_fee_percentage && (
                      <p className="text-sm text-red-500">{feeErrors.stripe_transaction_fee_percentage}</p>
                    )}
                  </div>

                  {/* Believe Points Transaction Fee */}
                  <div className="space-y-2 p-4 border rounded-lg bg-muted/50">
                    <Label htmlFor="believe_points_transaction_fee_percentage" className="flex items-center gap-2 text-base font-semibold">
                      <Sparkles className="h-5 w-5 text-purple-600" />
                      Believe Points Transaction Fee Percentage
                    </Label>
                    <div className="relative">
                      <Input
                        id="believe_points_transaction_fee_percentage"
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        value={feeData.believe_points_transaction_fee_percentage}
                        onChange={(e) =>
                          setFeeData("believe_points_transaction_fee_percentage", parseFloat(e.target.value) || 0)
                        }
                        className="pr-8 text-lg font-semibold"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">%</span>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">
                        Transaction fee percentage applied when buyers pay using Believe Points. This is typically lower than Stripe fees to incentivize sellers to accept Believe Points.
                      </p>
                      <p className="text-xs text-muted-foreground">
                        <strong>Example:</strong> If set to 1%, and an order is $100, the seller pays $1.00 as transaction fee (saving $2.00 compared to Stripe).
                      </p>
                      <div className="flex items-center gap-2 mt-2 p-2 bg-green-50 dark:bg-green-900/20 rounded">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        <p className="text-xs text-green-700 dark:text-green-300">
                          <strong>Discount:</strong> Sellers save {feeData.stripe_transaction_fee_percentage - feeData.believe_points_transaction_fee_percentage}% when accepting Believe Points payments.
                        </p>
                      </div>
                    </div>
                    {feeErrors.believe_points_transaction_fee_percentage && (
                      <p className="text-sm text-red-500">{feeErrors.believe_points_transaction_fee_percentage}</p>
                    )}
                  </div>

                  {/* Monthly Advertising Fee */}
                  <div className="space-y-2 p-4 border rounded-lg bg-muted/50">
                    <Label htmlFor="monthly_advertising_fee" className="flex items-center gap-2 text-base font-semibold">
                      <DollarSign className="h-5 w-5 text-orange-600" />
                      Monthly Advertising Fee
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">$</span>
                      <Input
                        id="monthly_advertising_fee"
                        type="number"
                        step="0.01"
                        min="0"
                        value={feeData.monthly_advertising_fee}
                        onChange={(e) => setFeeData("monthly_advertising_fee", parseFloat(e.target.value) || 0)}
                        className="pl-8 text-lg font-semibold"
                      />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">
                        Monthly subscription fee charged to sellers who have published at least one service/gig. This fee helps maintain the platform and provides visibility for sellers.
                      </p>
                      <p className="text-xs text-muted-foreground">
                        <strong>When charged:</strong> After a seller creates their seller profile and publishes at least one gig.
                      </p>
                      <p className="text-xs text-muted-foreground">
                        <strong>Billing cycle:</strong> Monthly, automatically charged on the same date each month.
                      </p>
                    </div>
                    {feeErrors.monthly_advertising_fee && (
                      <p className="text-sm text-red-500">{feeErrors.monthly_advertising_fee}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <Info className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    <p className="text-sm text-blue-800 dark:text-blue-300">
                      These settings are stored in the database. If not configured, the system will fall back to values
                      from the .env file.
                    </p>
                  </div>

                  <Button type="submit" disabled={processingFees} className="w-full sm:w-auto">
                    <Save className="mr-2 h-4 w-4" />
                    {processingFees ? "Saving..." : "Save Fee Settings"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
          )}

          {/* Sales Tax Rates Tab */}
          <TabsContent value="taxes" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <MapPin className="h-5 w-5" />
                      State Sales Tax Rates
                    </CardTitle>
                    <CardDescription>
                      {isAdmin
                        ? `Manage sales tax rates for all US states. Total: ${states.length} states`
                        : `View sales tax rates and certificate requirements for all US states. Total: ${states.length} states`}
                    </CardDescription>
                  </div>
                  {isAdmin && (
                    <div className="flex gap-2">
                      {bulkEditMode ? (
                        <>
                          <Button
                            variant="outline"
                            onClick={() => {
                              setBulkEditMode(false)
                              setEditingStates({})
                            }}
                          >
                            Cancel
                          </Button>
                          <Button onClick={handleBulkUpdate} className="bg-green-600 hover:bg-green-700">
                            <Save className="mr-2 h-4 w-4" />
                            Save All Changes
                          </Button>
                        </>
                      ) : (
                        <Button variant="outline" onClick={() => setBulkEditMode(true)}>
                          Bulk Edit
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Search/Filter */}
                  <div className="flex gap-2">
                    <Input placeholder="Search states..." className="flex-1" />
                  </div>

                  {/* States Table */}
                  <div className="border rounded-lg overflow-hidden">
                    <div className="max-h-[600px] overflow-y-auto">
                      <table className="w-full">
                        <thead className="bg-muted sticky top-0">
                          <tr>
                            <th className="px-4 py-3 text-left text-sm font-semibold">State</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold">State Code</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold">Tax Rate (%)</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold">Local Rates</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold">Requires Certificate</th>
                            {isAdmin && <th className="px-4 py-3 text-left text-sm font-semibold">Actions</th>}
                          </tr>
                        </thead>
                        <tbody>
                          {states.map((state) => {
                            const isEditing = editingStates[state.id] !== undefined
                            const currentValue = isEditing ? editingStates[state.id] : state.base_sales_tax_rate

                            return (
                              <tr key={state.id} className="border-t hover:bg-muted/50">
                                <td className="px-4 py-3">
                                  <div className="font-medium">{state.state}</div>
                                </td>
                                <td className="px-4 py-3">
                                  <Badge variant="outline">{state.state_code}</Badge>
                                </td>
                                <td className="px-4 py-3">
                                  {(isAdmin && (bulkEditMode || isEditing)) ? (
                                    <div className="flex items-center gap-2">
                                      <Input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        max="100"
                                        value={currentValue}
                                        onChange={(e) =>
                                          handleStateTaxChange(state.id, parseFloat(e.target.value) || 0)
                                        }
                                        className="w-24"
                                      />
                                      <span className="text-sm text-muted-foreground">%</span>
                                    </div>
                                  ) : (
                                    <span className="font-medium">{state.base_sales_tax_rate}%</span>
                                  )}
                                </td>
                                <td className="px-4 py-3">
                                  {state.local_rates_apply ? (
                                    <Badge variant="secondary">Yes</Badge>
                                  ) : (
                                    <Badge variant="outline">No</Badge>
                                  )}
                                </td>
                                <td className="px-4 py-3">
                                  {state.requires_exemption_certificate ? (
                                    <Badge className="bg-green-600">
                                      <FileCheck className="h-3 w-3 mr-1" />
                                      Yes
                                    </Badge>
                                  ) : (
                                    <Badge variant="secondary">No</Badge>
                                  )}
                                </td>
                                {isAdmin && (
                                  <td className="px-4 py-3">
                                    {!bulkEditMode && (
                                      <div className="flex items-center gap-2">
                                        {isEditing ? (
                                          <>
                                            <Button
                                              size="sm"
                                              variant="outline"
                                              onClick={() => {
                                                setEditingStates((prev) => {
                                                  const updated = { ...prev }
                                                  delete updated[state.id]
                                                  return updated
                                                })
                                              }}
                                            >
                                              Cancel
                                            </Button>
                                            <Button
                                              size="sm"
                                              onClick={() => handleStateTaxUpdate(state.id)}
                                              className="bg-green-600 hover:bg-green-700"
                                            >
                                              <Save className="h-3 w-3 mr-1" />
                                              Save
                                            </Button>
                                          </>
                                        ) : (
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handleStateTaxChange(state.id, state.base_sales_tax_rate)}
                                          >
                                            Edit
                                          </Button>
                                        )}
                                      </div>
                                    )}
                                  </td>
                                )}
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {states.length === 0 && (
                    <div className="text-center py-12">
                      <MapPin className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">No states found</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  )
}


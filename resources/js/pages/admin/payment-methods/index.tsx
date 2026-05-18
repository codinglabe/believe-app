"use client"

import type React from "react"
import { Head, useForm } from "@inertiajs/react"
import AppLayout from "@/layouts/app-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { showSuccessToast, showErrorToast } from "@/lib/toast"
import { CreditCard, ShoppingCartIcon as Paypal, Settings } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs" // Import Tabs components

interface SettingsProps {
  paypal_mode: "automatic" | "manual"
  paypal_client_id: string | null
  paypal_client_secret: string | null
  paypal_mode_environment: "sandbox" | "live"

  stripe_mode: "automatic" | "manual"
  stripe_client_id: string | null
  stripe_client_secret: string | null
  stripe_mode_environment: "sandbox" | "live"
}

interface Props {
  settings: SettingsProps
}

export default function PaymentMethodSettings({ settings }: Props) {
  const { data, setData, post, processing, errors } = useForm({
    paypal_mode: settings.paypal_mode,
    paypal_client_id: settings.paypal_client_id || "",
    paypal_client_secret: settings.paypal_client_secret || "",
    paypal_mode_environment: settings.paypal_mode_environment,

    stripe_mode: settings.stripe_mode,
    stripe_client_id: settings.stripe_client_id || "",
    stripe_client_secret: settings.stripe_client_secret || "",
    stripe_mode_environment: settings.stripe_mode_environment,
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    post(route("admin.payment-methods.update"), {
      onSuccess: () => {
        showSuccessToast("Payment method settings updated successfully!")
      },
      onError: (formErrors) => {
        showErrorToast("Failed to update settings. Please check the form.")
        console.error(formErrors)
      },
    })
  }

  return (
    <AppLayout>
      <Head title="Payment Method Settings" />
      <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-500 m-10">
        {/* Header */}
        <div className="flex flex-col space-y-4 sm:space-y-0 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2 animate-in slide-in-from-left duration-700">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white">
              Payment Method Settings
            </h1>
            <p className="text-sm sm:text-base lg:text-lg text-gray-600 dark:text-gray-400">
              Configure how withdrawals and purchases are handled for each payment gateway.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Tabs defaultValue="paypal" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="paypal">
                <Paypal className="mr-2 h-4 w-4" /> PayPal
              </TabsTrigger>
              <TabsTrigger value="stripe">
                <CreditCard className="mr-2 h-4 w-4" /> Stripe
              </TabsTrigger>
            </TabsList>

            {/* PayPal Settings Tab */}
            <TabsContent value="paypal">
              <Card className="shadow-lg hover:shadow-xl transition-all duration-300">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg sm:text-xl text-gray-900 dark:text-white">
                    PayPal Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <Label htmlFor="paypal_mode">PayPal Processing Mode</Label>
                    <Select
                      value={data.paypal_mode}
                      onValueChange={(value: "automatic" | "manual") => setData("paypal_mode", value)}
                    >
                      <SelectTrigger className="w-full mt-1 bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-white">
                        <SelectValue placeholder="Select mode" />
                      </SelectTrigger>
                      <SelectContent className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
                        <SelectItem value="automatic">Automatic (System processes via API)</SelectItem>
                        <SelectItem value="manual">Manual (Admin processes outside system)</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.paypal_mode && <p className="text-red-500 text-xs mt-1">{errors.paypal_mode}</p>}
                    <p className="text-sm text-gray-500 mt-2">
                      Choose whether PayPal transactions (withdrawals and deposits) are processed automatically via API
                      or manually by an admin.
                    </p>
                  </div>

                  {/* PayPal Credentials - Always visible */}
                  <div className="space-y-4 border-t pt-4">
                    <div>
                      <Label htmlFor="paypal_client_id">PayPal Client ID</Label>
                      <Input
                        id="paypal_client_id"
                        type="text"
                        value={data.paypal_client_id}
                        onChange={(e) => setData("paypal_client_id", e.target.value)}
                        className="mt-1 block w-full bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white"
                        placeholder="Enter PayPal Client ID"
                      />
                      {errors.paypal_client_id && (
                        <p className="text-red-500 text-xs mt-1">{errors.paypal_client_id}</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="paypal_client_secret">PayPal Client Secret</Label>
                      <Input
                        id="paypal_client_secret"
                        type="text"
                        value={data.paypal_client_secret}
                        onChange={(e) => setData("paypal_client_secret", e.target.value)}
                        className="mt-1 block w-full bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white"
                        placeholder="Enter PayPal Client Secret"
                      />
                      {errors.paypal_client_secret && (
                        <p className="text-red-500 text-xs mt-1">{errors.paypal_client_secret}</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="paypal_mode_environment">Environment</Label>
                      <Select
                        value={data.paypal_mode_environment}
                        onValueChange={(value: "sandbox" | "live") => setData("paypal_mode_environment", value)}
                      >
                        <SelectTrigger className="w-full mt-1 bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-white">
                          <SelectValue placeholder="Select environment" />
                        </SelectTrigger>
                        <SelectContent className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
                          <SelectItem value="sandbox">Sandbox</SelectItem>
                          <SelectItem value="live">Live</SelectItem>
                        </SelectContent>
                      </Select>
                      {errors.paypal_mode_environment && (
                        <p className="text-red-500 text-xs mt-1">{errors.paypal_mode_environment}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Stripe Settings Tab */}
            <TabsContent value="stripe">
              <Card className="shadow-lg hover:shadow-xl transition-all duration-300">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg sm:text-xl text-gray-900 dark:text-white">
                    Stripe Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <Label htmlFor="stripe_mode">Stripe Processing Mode</Label>
                    <Select
                      value={data.stripe_mode}
                      onValueChange={(value: "automatic" | "manual") => setData("stripe_mode", value)}
                    >
                      <SelectTrigger className="w-full mt-1 bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-white">
                        <SelectValue placeholder="Select mode" />
                      </SelectTrigger>
                      <SelectContent className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
                        <SelectItem value="automatic">Automatic (System processes via API)</SelectItem>
                        <SelectItem value="manual">Manual (Admin processes outside system)</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.stripe_mode && <p className="text-red-500 text-xs mt-1">{errors.stripe_mode}</p>}
                    <p className="text-sm text-gray-500 mt-2">
                      Choose whether Stripe transactions (withdrawals and deposits) are processed automatically via API
                      or manually by an admin.
                    </p>
                  </div>

                  {/* Stripe Credentials - Always visible */}
                  <div className="space-y-4 border-t pt-4">
                    <div>
                      <Label htmlFor="stripe_client_id">Stripe Publishable Key</Label>
                      <Input
                        id="stripe_client_id"
                        type="text"
                        value={data.stripe_client_id}
                        onChange={(e) => setData("stripe_client_id", e.target.value)}
                        className="mt-1 block w-full bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white"
                        placeholder="Enter Stripe Publishable Key (pk_...)"
                      />
                      {errors.stripe_client_id && (
                        <p className="text-red-500 text-xs mt-1">{errors.stripe_client_id}</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="stripe_client_secret">Stripe Secret Key</Label>
                      <Input
                        id="stripe_client_secret"
                        type="text"
                        value={data.stripe_client_secret}
                        onChange={(e) => setData("stripe_client_secret", e.target.value)}
                        className="mt-1 block w-full bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white"
                        placeholder="Enter Stripe Secret Key (sk_...)"
                      />
                      {errors.stripe_client_secret && (
                        <p className="text-red-500 text-xs mt-1">{errors.stripe_client_secret}</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="stripe_mode_environment">Environment</Label>
                      <Select
                        value={data.stripe_mode_environment}
                        onValueChange={(value: "sandbox" | "live") => setData("stripe_mode_environment", value)}
                      >
                        <SelectTrigger className="w-full mt-1 bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-white">
                          <SelectValue placeholder="Select environment" />
                        </SelectTrigger>
                        <SelectContent className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
                          <SelectItem value="sandbox">Test Mode (Stripe)</SelectItem>
                          <SelectItem value="live">Live Mode (Stripe)</SelectItem>
                        </SelectContent>
                      </Select>
                      {errors.stripe_mode_environment && (
                        <p className="text-red-500 text-xs mt-1">{errors.stripe_mode_environment}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <Button type="submit" disabled={processing} className="w-full sm:w-auto">
            <Settings className="mr-2 h-4 w-4" />
            {processing ? "Saving..." : "Save Settings"}
          </Button>
        </form>
      </div>
    </AppLayout>
  )
}

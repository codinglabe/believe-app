"use client"

import React from "react"
import { Head, useForm } from "@inertiajs/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { showSuccessToast, showErrorToast } from "@/lib/toast"
import { CreditCard, ShoppingCartIcon as Paypal, Settings, Eye, EyeOff } from "lucide-react" // Import Eye and EyeOff
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import SettingsLayout from "@/layouts/settings/layout"

interface SettingsProps {
  paypal_mode: "automatic" | "manual"
  paypal_client_id: string | null
  paypal_client_secret: string | null
  paypal_mode_environment: "sandbox" | "live"

  stripe_mode: "automatic" | "manual"
  stripe_client_id: string | null
  stripe_client_secret: string | null
  stripe_mode_environment: "sandbox" | "live"
  
  // Test credentials
  stripe_test_publishable_key: string | null
  stripe_test_secret_key: string | null
  stripe_test_customer_id: string | null
  
  // Live credentials
  stripe_live_publishable_key: string | null
  stripe_live_secret_key: string | null
  stripe_live_customer_id: string | null
}

interface Props {
  settings: SettingsProps
}

export default function PaymentMethodSettings({ settings }: Props) {
  const { data, setData, post, processing, errors } = useForm({
    paypal_mode: 'automatic', // Default value, not shown in UI
    paypal_client_id: settings.paypal_client_id || "",
    paypal_client_secret: settings.paypal_client_secret || "",
    paypal_mode_environment: settings.paypal_mode_environment,

    stripe_mode: 'automatic', // Default value, not shown in UI
    stripe_client_id: settings.stripe_client_id || "",
    stripe_client_secret: settings.stripe_client_secret || "",
    stripe_mode_environment: settings.stripe_mode_environment,
    
    // Test credentials
    stripe_test_publishable_key: settings.stripe_test_publishable_key || "",
    stripe_test_secret_key: settings.stripe_test_secret_key || "",
    
    // Live credentials
    stripe_live_publishable_key: settings.stripe_live_publishable_key || "",
    stripe_live_secret_key: settings.stripe_live_secret_key || "",
  })

  // State for password visibility
  const [showPaypalClientId, setShowPaypalClientId] = React.useState(false)
  const [showPaypalClientSecret, setShowPaypalClientSecret] = React.useState(false)
  const [showStripePublishable, setShowStripePublishable] = React.useState(false)
  const [showStripeSecret, setShowStripeSecret] = React.useState(false)
  
  // Current Stripe environment (sandbox = test, live = live)
  const [stripeEnvironment, setStripeEnvironment] = React.useState<"sandbox" | "live">(
    settings.stripe_mode_environment || "sandbox"
  )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    post("/settings/payment-methods", {
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
    <SettingsLayout activeTab="payment-methods">
      <Head title="Payment Method Settings" />
      <div className="space-y-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <Tabs defaultValue="paypal" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="paypal" className="cursor-pointer">
                <Paypal className="mr-2 h-4 w-4" /> PayPal
              </TabsTrigger>
              <TabsTrigger value="stripe" className="cursor-pointer">
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
                  {/* PayPal Credentials */}
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="paypal_client_id">PayPal Client ID</Label>
                      <div className="relative">
                        <Input
                          id="paypal_client_id"
                          type={showPaypalClientId ? "text" : "password"}
                          value={data.paypal_client_id}
                          onChange={(e) => setData("paypal_client_id", e.target.value)}
                          className="pr-10"
                          placeholder="Enter PayPal Client ID"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowPaypalClientId((prev) => !prev)}
                        >
                          {showPaypalClientId ? (
                            <EyeOff className="h-4 w-4 text-gray-500" />
                          ) : (
                            <Eye className="h-4 w-4 text-gray-500" />
                          )}
                        </Button>
                      </div>
                      {errors.paypal_client_id && (
                        <p className="text-sm text-red-500 mt-1">{errors.paypal_client_id}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="paypal_client_secret">PayPal Client Secret</Label>
                      <div className="relative">
                        <Input
                          id="paypal_client_secret"
                          type={showPaypalClientSecret ? "text" : "password"}
                          value={data.paypal_client_secret}
                          onChange={(e) => setData("paypal_client_secret", e.target.value)}
                          className="pr-10"
                          placeholder="Enter PayPal Client Secret"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowPaypalClientSecret((prev) => !prev)}
                        >
                          {showPaypalClientSecret ? (
                            <EyeOff className="h-4 w-4 text-gray-500" />
                          ) : (
                            <Eye className="h-4 w-4 text-gray-500" />
                          )}
                        </Button>
                      </div>
                      {errors.paypal_client_secret && (
                        <p className="text-sm text-red-500 mt-1">{errors.paypal_client_secret}</p>
                      )}
                    </div>

                    {/* Environment Dropdown at the bottom */}
                    <div className="space-y-2 border-t pt-4">
                      <Label htmlFor="paypal_mode_environment">Environment</Label>
                      <Select
                        value={data.paypal_mode_environment}
                        onValueChange={(value: "sandbox" | "live") => setData("paypal_mode_environment", value)}
                      >
                        <SelectTrigger id="paypal_mode_environment">
                          <SelectValue placeholder="Select environment" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="sandbox">Sandbox (Test)</SelectItem>
                          <SelectItem value="live">Live</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Select Sandbox for test mode or Live for production.
                      </p>
                      {errors.paypal_mode_environment && (
                        <p className="text-sm text-red-500 mt-1">{errors.paypal_mode_environment}</p>
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
                  {/* Stripe Credentials - Dynamic based on environment */}
                  <div className="space-y-4">
                    {/* Show customer ID if available */}
                    {(stripeEnvironment === "sandbox" ? settings.stripe_test_customer_id : settings.stripe_live_customer_id) && (
                      <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-md border border-green-200 dark:border-green-800">
                        <p className="text-sm text-green-700 dark:text-green-300">
                          <strong>Customer ID:</strong> {stripeEnvironment === "sandbox" ? settings.stripe_test_customer_id : settings.stripe_live_customer_id}
                        </p>
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="stripe_publishable_key">
                        {stripeEnvironment === "sandbox" ? "Test" : "Live"} Publishable Key
                      </Label>
                      <div className="relative">
                        <Input
                          id="stripe_publishable_key"
                          type={showStripePublishable ? "text" : "password"}
                          value={stripeEnvironment === "sandbox" ? data.stripe_test_publishable_key : data.stripe_live_publishable_key}
                          onChange={(e) => {
                            if (stripeEnvironment === "sandbox") {
                              setData("stripe_test_publishable_key", e.target.value)
                            } else {
                              setData("stripe_live_publishable_key", e.target.value)
                            }
                          }}
                          className="pr-10"
                          placeholder={stripeEnvironment === "sandbox" ? "Enter Test Publishable Key (pk_test_...)" : "Enter Live Publishable Key (pk_live_...)"}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowStripePublishable((prev) => !prev)}
                        >
                          {showStripePublishable ? (
                            <EyeOff className="h-4 w-4 text-gray-500" />
                          ) : (
                            <Eye className="h-4 w-4 text-gray-500" />
                          )}
                        </Button>
                      </div>
                      {(errors.stripe_test_publishable_key || errors.stripe_live_publishable_key) && (
                        <p className="text-sm text-red-500 mt-1">
                          {stripeEnvironment === "sandbox" ? errors.stripe_test_publishable_key : errors.stripe_live_publishable_key}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="stripe_secret_key">
                        {stripeEnvironment === "sandbox" ? "Test" : "Live"} Secret Key
                      </Label>
                      <div className="relative">
                        <Input
                          id="stripe_secret_key"
                          type={showStripeSecret ? "text" : "password"}
                          value={stripeEnvironment === "sandbox" ? data.stripe_test_secret_key : data.stripe_live_secret_key}
                          onChange={(e) => {
                            if (stripeEnvironment === "sandbox") {
                              setData("stripe_test_secret_key", e.target.value)
                            } else {
                              setData("stripe_live_secret_key", e.target.value)
                            }
                          }}
                          className="pr-10"
                          placeholder={stripeEnvironment === "sandbox" ? "Enter Test Secret Key (sk_test_...)" : "Enter Live Secret Key (sk_live_...)"}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowStripeSecret((prev) => !prev)}
                        >
                          {showStripeSecret ? (
                            <EyeOff className="h-4 w-4 text-gray-500" />
                          ) : (
                            <Eye className="h-4 w-4 text-gray-500" />
                          )}
                        </Button>
                      </div>
                      {(errors.stripe_test_secret_key || errors.stripe_live_secret_key) && (
                        <p className="text-sm text-red-500 mt-1">
                          {stripeEnvironment === "sandbox" ? errors.stripe_test_secret_key : errors.stripe_live_secret_key}
                        </p>
                      )}
                    </div>

                    {/* Environment Dropdown at the bottom */}
                    <div className="space-y-2 border-t pt-4">
                      <Label htmlFor="stripe_environment">Environment</Label>
                      <Select
                        value={stripeEnvironment}
                        onValueChange={(value: "sandbox" | "live") => {
                          setStripeEnvironment(value)
                          setData("stripe_mode_environment", value)
                        }}
                      >
                        <SelectTrigger id="stripe_environment">
                          <SelectValue placeholder="Select environment" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="sandbox">Sandbox (Test)</SelectItem>
                          <SelectItem value="live">Live</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Select Sandbox for test mode or Live for production. Customer will be created/fetched automatically when you save.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            </Tabs>

          <div className="flex justify-end">
            <Button type="submit" disabled={processing} className="w-full sm:w-auto">
              <Settings className="mr-2 h-4 w-4" />
              {processing ? "Saving..." : "Save Settings"}
            </Button>
          </div>
        </form>
      </div>
    </SettingsLayout>
  )
}

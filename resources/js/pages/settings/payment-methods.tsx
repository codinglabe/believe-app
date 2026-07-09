"use client"

import React from "react"
import { Head, useForm, usePage } from "@inertiajs/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { showSuccessToast, showErrorToast } from "@/lib/toast"
import { CreditCard, ShoppingCartIcon as Paypal, Settings, Eye, EyeOff } from "lucide-react" // Import Eye and EyeOff
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import SettingsLayout from "@/layouts/settings/layout"

interface StripeEnvironmentSetup {
  keys_configured: boolean
  webhook_configured: boolean
  customer_configured: boolean
  setup_complete: boolean
  webhook_secret_preview: string | null
  webhook_endpoint_id: string | null
}

interface SettingsProps {
  paypal_mode: "automatic" | "manual"
  paypal_client_id: string | null
  paypal_client_secret: string | null
  paypal_mode_environment: "sandbox" | "live"

  stripe_mode: "automatic" | "manual"
  stripe_client_id: string | null
  stripe_client_secret: string | null
  stripe_mode_environment: "sandbox" | "test" | "live"
  
  // Sandbox credentials
  stripe_sandbox_publishable_key: string | null
  stripe_sandbox_secret_key: string | null
  stripe_sandbox_customer_id: string | null
  stripe_sandbox_account_id: string | null
  
  // Test credentials
  stripe_test_publishable_key: string | null
  stripe_test_secret_key: string | null
  stripe_test_customer_id: string | null
  stripe_test_account_id: string | null
  
  // Live credentials
  stripe_live_publishable_key: string | null
  stripe_live_secret_key: string | null
  stripe_live_customer_id: string | null
  stripe_live_account_id: string | null

  stripe_webhook_url: string
  stripe_webhook_events: string[]
  stripe_sandbox_setup: StripeEnvironmentSetup
  stripe_test_setup: StripeEnvironmentSetup
  stripe_live_setup: StripeEnvironmentSetup

  stripe_sandbox_connect_client_id: string | null
  stripe_test_connect_client_id: string | null
  stripe_live_connect_client_id: string | null
  stripe_connect_oauth_callback_url: string
}

interface Props {
  settings: SettingsProps
}

type StripeEnvironment = "sandbox" | "test" | "live"

const stripeEnvironmentLabels: Record<StripeEnvironment, string> = {
  sandbox: "Sandbox",
  test: "Test",
  live: "Live",
}

const stripePublishablePlaceholders: Record<StripeEnvironment, string> = {
  sandbox: "Enter Sandbox Publishable Key (pk_test_...)",
  test: "Enter Test Publishable Key (pk_test_...)",
  live: "Enter Live Publishable Key (pk_live_...)",
}

const stripeSecretPlaceholders: Record<StripeEnvironment, string> = {
  sandbox: "Enter Sandbox Secret Key (sk_test_...)",
  test: "Enter Test Secret Key (sk_test_...)",
  live: "Enter Live Secret Key (sk_live_...)",
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

    // Sandbox credentials
    stripe_sandbox_publishable_key: settings.stripe_sandbox_publishable_key || "",
    stripe_sandbox_secret_key: settings.stripe_sandbox_secret_key || "",
    
    // Test credentials
    stripe_test_publishable_key: settings.stripe_test_publishable_key || "",
    stripe_test_secret_key: settings.stripe_test_secret_key || "",
    
    // Live credentials
    stripe_live_publishable_key: settings.stripe_live_publishable_key || "",
    stripe_live_secret_key: settings.stripe_live_secret_key || "",

    stripe_sandbox_connect_client_id: settings.stripe_sandbox_connect_client_id || "",
    stripe_test_connect_client_id: settings.stripe_test_connect_client_id || "",
    stripe_live_connect_client_id: settings.stripe_live_connect_client_id || "",
  })

  // State for password visibility
  const [showPaypalClientId, setShowPaypalClientId] = React.useState(false)
  const [showPaypalClientSecret, setShowPaypalClientSecret] = React.useState(false)
  const [showStripePublishable, setShowStripePublishable] = React.useState(false)
  const [showStripeSecret, setShowStripeSecret] = React.useState(false)
  const [showStripeConnectClientId, setShowStripeConnectClientId] = React.useState(false)
  
  const [stripeEnvironment, setStripeEnvironment] = React.useState<StripeEnvironment>(
    (settings.stripe_mode_environment as StripeEnvironment) || "sandbox"
  )

  React.useEffect(() => {
    setStripeEnvironment((settings.stripe_mode_environment as StripeEnvironment) || "sandbox")
  }, [
    settings.stripe_mode_environment,
    settings.stripe_sandbox_account_id,
    settings.stripe_test_account_id,
    settings.stripe_live_account_id,
  ])

  const stripeAccountIdByEnvironment: Record<StripeEnvironment, string | null | undefined> = {
    sandbox: settings.stripe_sandbox_account_id,
    test: settings.stripe_test_account_id,
    live: settings.stripe_live_account_id,
  }

  const stripeCustomerIdByEnvironment: Record<StripeEnvironment, string | null | undefined> = {
    sandbox: settings.stripe_sandbox_customer_id,
    test: settings.stripe_test_customer_id,
    live: settings.stripe_live_customer_id,
  }

  const stripePublishableKeyByEnvironment: Record<StripeEnvironment, string> = {
    sandbox: data.stripe_sandbox_publishable_key,
    test: data.stripe_test_publishable_key,
    live: data.stripe_live_publishable_key,
  }

  const stripeSecretKeyByEnvironment: Record<StripeEnvironment, string> = {
    sandbox: data.stripe_sandbox_secret_key,
    test: data.stripe_test_secret_key,
    live: data.stripe_live_secret_key,
  }

  const stripeConnectClientIdByEnvironment: Record<StripeEnvironment, string> = {
    sandbox: data.stripe_sandbox_connect_client_id,
    test: data.stripe_test_connect_client_id,
    live: data.stripe_live_connect_client_id,
  }

  const setStripeConnectClientId = (environment: StripeEnvironment, value: string) => {
    if (environment === "sandbox") {
      setData("stripe_sandbox_connect_client_id", value)
      return
    }
    if (environment === "test") {
      setData("stripe_test_connect_client_id", value)
      return
    }
    setData("stripe_live_connect_client_id", value)
  }

  const setStripePublishableKey = (environment: StripeEnvironment, value: string) => {
    if (environment === "sandbox") {
      setData("stripe_sandbox_publishable_key", value)
      return
    }
    if (environment === "test") {
      setData("stripe_test_publishable_key", value)
      return
    }
    setData("stripe_live_publishable_key", value)
  }

  const setStripeSecretKey = (environment: StripeEnvironment, value: string) => {
    if (environment === "sandbox") {
      setData("stripe_sandbox_secret_key", value)
      return
    }
    if (environment === "test") {
      setData("stripe_test_secret_key", value)
      return
    }
    setData("stripe_live_secret_key", value)
  }

  const stripePublishableError =
    stripeEnvironment === "sandbox"
      ? errors.stripe_sandbox_publishable_key
      : stripeEnvironment === "test"
        ? errors.stripe_test_publishable_key
        : errors.stripe_live_publishable_key

  const stripeSetupByEnvironment: Record<StripeEnvironment, StripeEnvironmentSetup> = {
    sandbox: settings.stripe_sandbox_setup,
    test: settings.stripe_test_setup,
    live: settings.stripe_live_setup,
  }

  const activeStripeSetup = stripeSetupByEnvironment[stripeEnvironment]

  const { flash } = usePage<{ flash?: { success?: string; error?: string } }>().props

  React.useEffect(() => {
    if (flash?.success) {
      showSuccessToast(flash.success)
    }
    if (flash?.error) {
      showErrorToast(flash.error)
    }
  }, [flash?.success, flash?.error])

  const stripeSecretError =
    stripeEnvironment === "sandbox"
      ? errors.stripe_sandbox_secret_key
      : stripeEnvironment === "test"
        ? errors.stripe_test_secret_key
        : errors.stripe_live_secret_key

  const stripeConnectClientIdError =
    stripeEnvironment === "sandbox"
      ? errors.stripe_sandbox_connect_client_id
      : stripeEnvironment === "test"
        ? errors.stripe_test_connect_client_id
        : errors.stripe_live_connect_client_id

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    post("/settings/payment-methods", {
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
                  {/* Resolved Stripe account for active mode */}
                  {stripeAccountIdByEnvironment[stripeEnvironment] ? (
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md border border-blue-200 dark:border-blue-800">
                      <p className="text-sm text-blue-800 dark:text-blue-200">
                        <strong>Stripe Account ({stripeEnvironmentLabels[stripeEnvironment]}):</strong>{" "}
                        <code className="font-mono text-xs sm:text-sm">
                          {stripeAccountIdByEnvironment[stripeEnvironment]}
                        </code>
                      </p>
                    </div>
                  ) : (
                    <div className="p-3 bg-muted/50 rounded-md border border-border">
                      <p className="text-sm text-muted-foreground">
                        Save valid {stripeEnvironmentLabels[stripeEnvironment]} keys to resolve your Stripe account ID (
                        <code className="font-mono text-xs">acct_...</code>).
                      </p>
                    </div>
                  )}

                  {/* Stripe Credentials - Dynamic based on environment */}
                  <div className="space-y-4">
                    {/* Show customer ID if available */}
                    {stripeCustomerIdByEnvironment[stripeEnvironment] && (
                      <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-md border border-green-200 dark:border-green-800">
                        <p className="text-sm text-green-700 dark:text-green-300">
                          <strong>Customer ID:</strong> {stripeCustomerIdByEnvironment[stripeEnvironment]}
                        </p>
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="stripe_publishable_key">
                        {stripeEnvironmentLabels[stripeEnvironment]} Publishable Key
                      </Label>
                      <div className="relative">
                        <Input
                          id="stripe_publishable_key"
                          type={showStripePublishable ? "text" : "password"}
                          value={stripePublishableKeyByEnvironment[stripeEnvironment]}
                          onChange={(e) => setStripePublishableKey(stripeEnvironment, e.target.value)}
                          className="pr-10"
                          placeholder={stripePublishablePlaceholders[stripeEnvironment]}
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
                      {stripePublishableError && (
                        <p className="text-sm text-red-500 mt-1">{stripePublishableError}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="stripe_secret_key">
                        {stripeEnvironmentLabels[stripeEnvironment]} Secret Key
                      </Label>
                      <div className="relative">
                        <Input
                          id="stripe_secret_key"
                          type={showStripeSecret ? "text" : "password"}
                          value={stripeSecretKeyByEnvironment[stripeEnvironment]}
                          onChange={(e) => setStripeSecretKey(stripeEnvironment, e.target.value)}
                          className="pr-10"
                          placeholder={stripeSecretPlaceholders[stripeEnvironment]}
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
                      {stripeSecretError && (
                        <p className="text-sm text-red-500 mt-1">{stripeSecretError}</p>
                      )}
                    </div>

                    <div className="space-y-3 rounded-md border border-purple-200/60 bg-purple-50/50 p-4 dark:border-purple-800/40 dark:bg-purple-950/20">
                      <div>
                        <p className="text-sm font-semibold text-foreground">Stripe Connect — Standard OAuth</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Required for nonprofit donation payouts. Copy the <strong>Live client ID</strong> from Stripe Dashboard →
                          Settings → Connect → OAuth (<code className="text-xs">ca_...</code>). Enable OAuth for Stripe Dashboard accounts
                          and add the redirect URI below in Stripe.
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="stripe_connect_client_id">
                          {stripeEnvironmentLabels[stripeEnvironment]} Connect OAuth client ID
                        </Label>
                        <div className="relative">
                          <Input
                            id="stripe_connect_client_id"
                            type={showStripeConnectClientId ? "text" : "password"}
                            value={stripeConnectClientIdByEnvironment[stripeEnvironment]}
                            onChange={(e) => setStripeConnectClientId(stripeEnvironment, e.target.value)}
                            className="pr-10 font-mono text-sm"
                            placeholder="ca_xxxxxxxxxxxxxxxxxxxxxxxx"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                            onClick={() => setShowStripeConnectClientId((prev) => !prev)}
                          >
                            {showStripeConnectClientId ? (
                              <EyeOff className="h-4 w-4 text-gray-500" />
                            ) : (
                              <Eye className="h-4 w-4 text-gray-500" />
                            )}
                          </Button>
                        </div>
                        {stripeConnectClientIdError && (
                          <p className="text-sm text-red-500 mt-1">{stripeConnectClientIdError}</p>
                        )}
                      </div>
                      <div className="space-y-1">
                        <Label>OAuth redirect URI (add in Stripe Connect settings)</Label>
                        <code className="block break-all rounded bg-background px-2 py-1.5 text-xs font-mono">
                          {settings.stripe_connect_oauth_callback_url}
                        </code>
                      </div>
                    </div>

                    <div className="space-y-3 rounded-md border border-border bg-muted/30 p-4">
                      <div>
                        <p className="text-sm font-semibold text-foreground">Automatic Stripe setup</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          When you save your publishable and secret keys, the app creates the Cashier webhook,
                          platform customer, donation product, and syncs plans — no Stripe Dashboard configuration
                          required.
                        </p>
                      </div>
                      <div className="space-y-1">
                        <Label>Webhook URL (created for you)</Label>
                        <code className="block break-all rounded bg-background px-2 py-1.5 text-xs font-mono">
                          {settings.stripe_webhook_url}
                        </code>
                      </div>
                      <div className="space-y-2">
                        <Label>Status ({stripeEnvironmentLabels[stripeEnvironment]})</Label>
                        {activeStripeSetup.setup_complete ? (
                          <div className="rounded-md border border-green-200 bg-green-50 p-3 dark:border-green-800 dark:bg-green-900/20">
                            <p className="text-sm font-medium text-green-800 dark:text-green-300">
                              Configured — webhook created in Stripe
                            </p>
                            {activeStripeSetup.webhook_endpoint_id && (
                              <p className="mt-1 text-sm text-green-700 dark:text-green-400">
                                Stripe endpoint:{" "}
                                <code className="rounded bg-background/80 px-1.5 py-0.5 font-mono text-xs">
                                  {activeStripeSetup.webhook_endpoint_id}
                                </code>
                              </p>
                            )}
                            {activeStripeSetup.webhook_secret_preview && (
                              <p className="mt-1 text-sm text-green-700 dark:text-green-400">
                                Signing secret:{" "}
                                <code className="rounded bg-background/80 px-1.5 py-0.5 font-mono text-xs">
                                  {activeStripeSetup.webhook_secret_preview}
                                </code>
                              </p>
                            )}
                            <p className="mt-1 text-xs text-green-700/80 dark:text-green-400/80">
                              Look for this endpoint under Stripe Dashboard → Developers → Webhooks.
                            </p>
                          </div>
                        ) : activeStripeSetup.keys_configured ? (
                          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-900/20">
                            <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                              Keys saved — click Save again to create the Stripe webhook
                            </p>
                            <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">
                              {!activeStripeSetup.webhook_configured && "Webhook not created in Stripe yet. "}
                              {!activeStripeSetup.customer_configured && "Platform customer pending. "}
                              Confirm APP_URL in .env matches your public site URL.
                            </p>
                          </div>
                        ) : (
                          <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                            Save your {stripeEnvironmentLabels[stripeEnvironment]} keys to auto-create everything
                          </p>
                        )}
                      </div>
                      <details className="text-xs text-muted-foreground">
                        <summary className="cursor-pointer font-medium text-foreground">
                          Required Stripe events ({settings.stripe_webhook_events.length})
                        </summary>
                        <ul className="mt-2 list-inside list-disc space-y-0.5">
                          {settings.stripe_webhook_events.map((event) => (
                            <li key={event}>
                              <code>{event}</code>
                            </li>
                          ))}
                        </ul>
                      </details>
                    </div>

                    {/* Environment Dropdown at the bottom */}
                    <div className="space-y-2 border-t pt-4">
                      <Label htmlFor="stripe_environment">Active Mode</Label>
                      <Select
                        value={stripeEnvironment}
                        onValueChange={(value: StripeEnvironment) => {
                          setStripeEnvironment(value)
                          setData("stripe_mode_environment", value)
                        }}
                      >
                        <SelectTrigger id="stripe_environment">
                          <SelectValue placeholder="Select mode" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="sandbox">Sandbox</SelectItem>
                          <SelectItem value="test">Test</SelectItem>
                          <SelectItem value="live">Live</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Choose which Stripe account the app uses. Sandbox is for Bridge Issuing / isolated sandbox keys, Test for Stripe test mode, and Live for production.
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

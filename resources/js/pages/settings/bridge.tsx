"use client"

import React, { useEffect } from "react"
import { Head, Link, router, useForm, usePage } from "@inertiajs/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { showSuccessToast, showErrorToast } from "@/lib/toast"
import { CreditCard, Eye, EyeOff, Loader2, Settings, Webhook } from "lucide-react"
import SettingsLayout from "@/layouts/settings/layout"

interface SettingsProps {
  bridge_mode_environment: "sandbox" | "live"
  bridge_sandbox_api_key: string | null
  bridge_sandbox_webhook_url: string | null
  bridge_sandbox_webhook_id: string | null
  bridge_sandbox_webhook_public_key: string | null
  bridge_sandbox_badge_url: string | null
  bridge_live_api_key: string | null
  bridge_live_webhook_id: string | null
  bridge_live_webhook_public_key: string | null
  bridge_live_badge_url: string | null
  bridge_sandbox_stripe_account_id: string | null
  bridge_live_stripe_account_id: string | null
  bridge_cards_program_type: string
  bridge_cards_enabled_at: string | null
  bridge_cards_enable_stripe_account_id: string | null
  bridge_resolved_stripe_account_id: string | null
  stripe_cashier_configured: boolean
  stripe_issuing_readiness: {
    configured: boolean
    account_id: string | null
    issuing_enabled: boolean
    needs_bridge_stripe_app?: boolean
    message: string
  }
  bridge_stripe_app_install_url: string | null
  app_url: string
}

interface Props {
  settings: SettingsProps
}

export default function BridgeSettings({ settings }: Props) {
  const { success, error } = usePage<{ success?: string; error?: string }>().props
  const defaultWebhookUrl = settings.app_url ? `${settings.app_url}/webhooks/bridge` : `${window.location.origin}/webhooks/bridge`

  const { data, setData, post, processing, errors } = useForm({
    bridge_mode_environment: settings.bridge_mode_environment || "sandbox",
    bridge_sandbox_api_key: settings.bridge_sandbox_api_key || "",
    bridge_sandbox_webhook_url: settings.bridge_sandbox_webhook_url || defaultWebhookUrl,
    bridge_sandbox_badge_url: settings.bridge_sandbox_badge_url || "",
    bridge_live_api_key: settings.bridge_live_api_key || "",
    bridge_live_badge_url: settings.bridge_live_badge_url || "",
    bridge_sandbox_stripe_account_id: settings.bridge_sandbox_stripe_account_id || "",
    bridge_live_stripe_account_id: settings.bridge_live_stripe_account_id || "",
    bridge_cards_program_type: settings.bridge_cards_program_type || "consumer",
    bridge_stripe_app_install_url: settings.bridge_stripe_app_install_url || "",
  })

  const [showSandboxApiKey, setShowSandboxApiKey] = React.useState(false)
  const [showLiveApiKey, setShowLiveApiKey] = React.useState(false)
  const [enablingCards, setEnablingCards] = React.useState(false)

  const [bridgeEnvironment, setBridgeEnvironment] = React.useState<"sandbox" | "live">(
    settings.bridge_mode_environment || "sandbox"
  )

  useEffect(() => {
    if (success) showSuccessToast(success)
    if (error) showErrorToast(error)
  }, [success, error])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    post("/settings/bridge", {
      onSuccess: () => {
        showSuccessToast("Bridge settings updated successfully! Webhooks have been created/activated automatically.")
      },
      onError: (formErrors) => {
        showErrorToast("Failed to update settings. Please check the form.")
        console.error(formErrors)
      },
    })
  }

  const handleEnableCards = () => {
    setEnablingCards(true)
    router.post(
      route("bridge.enable-cards"),
      { bridge_cards_program_type: data.bridge_cards_program_type },
      {
        preserveScroll: true,
        onFinish: () => setEnablingCards(false),
      }
    )
  }

  const resolvedStripeAccountId = settings.bridge_resolved_stripe_account_id
  const stripeOverride =
    bridgeEnvironment === "sandbox"
      ? data.bridge_sandbox_stripe_account_id
      : data.bridge_live_stripe_account_id

  return (
    <SettingsLayout activeTab="bridge">
      <Head title="Bridge Settings" />
      <div className="space-y-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <Card className="shadow-lg hover:shadow-xl transition-all duration-300">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl text-gray-900 dark:text-white">
                <Webhook className="h-5 w-5" />
                Bridge Wallet Settings
              </CardTitle>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                Configure Bridge API credentials. Webhooks will be created and activated automatically when you save.
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2 border-b pb-4">
                <Label htmlFor="bridge_environment">Environment</Label>
                <Select
                  value={bridgeEnvironment}
                  onValueChange={(value: "sandbox" | "live") => {
                    setBridgeEnvironment(value)
                    setData("bridge_mode_environment", value)
                  }}
                >
                  <SelectTrigger id="bridge_environment">
                    <SelectValue placeholder="Select environment" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sandbox">Sandbox (Test)</SelectItem>
                    <SelectItem value="live">Live (Production)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Select Sandbox for test mode or Live for production. Webhooks will be created/activated automatically when you save.
                </p>
              </div>

              {bridgeEnvironment === "sandbox" && (
                <div className="space-y-4">
                  {settings.bridge_sandbox_webhook_id && (
                    <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-md border border-green-200 dark:border-green-800 space-y-2">
                      <p className="text-sm font-medium text-green-700 dark:text-green-300">
                        ✓ Webhook Configured
                      </p>
                      <p className="text-xs text-green-600 dark:text-green-400">
                        <strong>Webhook ID:</strong> {settings.bridge_sandbox_webhook_id}
                      </p>
                      {settings.bridge_sandbox_webhook_public_key && (
                        <p className="text-xs text-green-600 dark:text-green-400 break-all">
                          <strong>Public Key:</strong> {settings.bridge_sandbox_webhook_public_key.substring(0, 50)}...
                        </p>
                      )}
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="bridge_sandbox_api_key">Sandbox API Key</Label>
                    <div className="relative">
                      <Input
                        id="bridge_sandbox_api_key"
                        type={showSandboxApiKey ? "text" : "password"}
                        value={data.bridge_sandbox_api_key}
                        onChange={(e) => setData("bridge_sandbox_api_key", e.target.value)}
                        className="pr-10"
                        placeholder="Enter Sandbox API Key (sk-test-...)"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowSandboxApiKey((prev) => !prev)}
                      >
                        {showSandboxApiKey ? (
                          <EyeOff className="h-4 w-4 text-gray-500" />
                        ) : (
                          <Eye className="h-4 w-4 text-gray-500" />
                        )}
                      </Button>
                    </div>
                    {errors.bridge_sandbox_api_key && (
                      <p className="text-sm text-red-500 mt-1">{errors.bridge_sandbox_api_key}</p>
                    )}
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Your Bridge Sandbox API key. Get it from your Bridge dashboard.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bridge_sandbox_webhook_url">Sandbox Webhook URL</Label>
                    <Input
                      id="bridge_sandbox_webhook_url"
                      type="url"
                      value={data.bridge_sandbox_webhook_url}
                      onChange={(e) => setData("bridge_sandbox_webhook_url", e.target.value)}
                      placeholder="https://your-domain.com/webhooks/bridge"
                    />
                    {errors.bridge_sandbox_webhook_url && (
                      <p className="text-sm text-red-500 mt-1">{errors.bridge_sandbox_webhook_url}</p>
                    )}
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Custom webhook URL for sandbox environment. Defaults to your website URL. You can use a tunnel URL (e.g., ngrok) for local development.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bridge_sandbox_badge_url">Sandbox Badge URL</Label>
                    <Input
                      id="bridge_sandbox_badge_url"
                      type="url"
                      value={data.bridge_sandbox_badge_url}
                      onChange={(e) => setData("bridge_sandbox_badge_url", e.target.value)}
                      placeholder="https://your-domain.com/badge.png"
                    />
                    {errors.bridge_sandbox_badge_url && (
                      <p className="text-sm text-red-500 mt-1">{errors.bridge_sandbox_badge_url}</p>
                    )}
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Badge URL for sandbox environment. This is the URL to your badge image that will be displayed in Bridge wallet interfaces.
                    </p>
                  </div>
                </div>
              )}

              {bridgeEnvironment === "live" && (
                <div className="space-y-4">
                  {settings.bridge_live_webhook_id && (
                    <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-md border border-green-200 dark:border-green-800 space-y-2">
                      <p className="text-sm font-medium text-green-700 dark:text-green-300">
                        ✓ Webhook Configured
                      </p>
                      <p className="text-xs text-green-600 dark:text-green-400">
                        <strong>Webhook ID:</strong> {settings.bridge_live_webhook_id}
                      </p>
                      {settings.bridge_live_webhook_public_key && (
                        <p className="text-xs text-green-600 dark:text-green-400 break-all">
                          <strong>Public Key:</strong> {settings.bridge_live_webhook_public_key.substring(0, 50)}...
                        </p>
                      )}
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="bridge_live_api_key">Live API Key</Label>
                    <div className="relative">
                      <Input
                        id="bridge_live_api_key"
                        type={showLiveApiKey ? "text" : "password"}
                        value={data.bridge_live_api_key}
                        onChange={(e) => setData("bridge_live_api_key", e.target.value)}
                        className="pr-10"
                        placeholder="Enter Live API Key (sk-live-...)"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowLiveApiKey((prev) => !prev)}
                      >
                        {showLiveApiKey ? (
                          <EyeOff className="h-4 w-4 text-gray-500" />
                        ) : (
                          <Eye className="h-4 w-4 text-gray-500" />
                        )}
                      </Button>
                    </div>
                    {errors.bridge_live_api_key && (
                      <p className="text-sm text-red-500 mt-1">{errors.bridge_live_api_key}</p>
                    )}
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Your Bridge Live API key. Get it from your Bridge dashboard.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bridge_live_badge_url">Live Badge URL</Label>
                    <Input
                      id="bridge_live_badge_url"
                      type="url"
                      value={data.bridge_live_badge_url}
                      onChange={(e) => setData("bridge_live_badge_url", e.target.value)}
                      placeholder="https://your-domain.com/badge.png"
                    />
                    {errors.bridge_live_badge_url && (
                      <p className="text-sm text-red-500 mt-1">{errors.bridge_live_badge_url}</p>
                    )}
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Badge URL for live environment. This is the URL to your badge image that will be displayed in Bridge wallet interfaces.
                    </p>
                  </div>
                </div>
              )}

              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-md border border-blue-200 dark:border-blue-800">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  <strong>Note:</strong> When you save your API keys, the system will automatically:
                </p>
                <ul className="text-xs text-blue-600 dark:text-blue-400 mt-2 list-disc list-inside space-y-1">
                  <li>Create a webhook endpoint at <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">{window.location.origin}/webhooks/bridge</code></li>
                  <li>Subscribe to all Bridge event categories (customer, kyc_link, transfer, etc.)</li>
                  <li>Activate the webhook automatically</li>
                  <li>Store the webhook ID and public key for signature verification</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg hover:shadow-xl transition-all duration-300">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl text-gray-900 dark:text-white">
                <CreditCard className="h-5 w-5" />
                Bridge Cards &amp; Laravel Cashier
              </CardTitle>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                {bridgeEnvironment === "sandbox" ? (
                  <>
                    Bridge sandbox cards require a linked Stripe Sandbox account. We resolve your Stripe account ID from Laravel Cashier (Settings → Stripe &amp; PayPal) and send it to Bridge via{" "}
                    <code className="text-xs">POST /cards/enable</code>.
                  </>
                ) : (
                  <>
                    Bridge live cards use <strong>Stripe Issuing</strong> on your production Stripe account — there is no{" "}
                    <code className="text-xs">POST /cards/enable</code> in production. Complete Bridge onboarding, install the Bridge Cards Stripe App on your live account, then verify setup below.
                  </>
                )}
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {!settings.stripe_cashier_configured && (
                <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-md border border-amber-200 dark:border-amber-800">
                  <p className="text-sm text-amber-800 dark:text-amber-200">
                    Stripe is not configured yet. Add your Cashier Stripe keys under{" "}
                    <Link href="/settings/payment-methods" className="underline font-medium">
                      Settings → Stripe &amp; PayPal
                    </Link>{" "}
                    before enabling Bridge cards.
                  </p>
                </div>
              )}

              {settings.stripe_issuing_readiness.issuing_enabled ? (
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-md border border-green-200 dark:border-green-800 space-y-1">
                  <p className="text-sm font-medium text-green-700 dark:text-green-300">
                    ✓ Bridge Cards Stripe App — Issuing active
                  </p>
                  <p className="text-xs text-green-600 dark:text-green-400">
                    {settings.stripe_issuing_readiness.message}
                    {settings.stripe_issuing_readiness.account_id && (
                      <> · <code>{settings.stripe_issuing_readiness.account_id}</code></>
                    )}
                  </p>
                </div>
              ) : (
                <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-md border border-amber-200 dark:border-amber-800 space-y-3">
                  <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
                    Stripe Issuing not active yet
                  </p>
                  <p className="text-xs text-amber-800 dark:text-amber-200">
                    {settings.stripe_issuing_readiness.message} Card issuance runs through{" "}
                    <strong>Stripe Issuing</strong>
                    {bridgeEnvironment === "sandbox" ? (
                      <> on a dedicated <strong>Stripe Sandbox</strong> (Dashboard → Sandboxes). Sandbox API keys still start with <code>sk_test_</code> — that is normal.</>
                    ) : (
                      <> on your <strong>live Stripe account</strong> (<code>sk_live_</code> keys under Settings → Stripe &amp; PayPal).</>
                    )}
                  </p>
                  <ol className="text-xs text-amber-800 dark:text-amber-200 list-decimal list-inside space-y-1.5">
                    {bridgeEnvironment === "sandbox" ? (
                      <>
                        <li>
                          Use a <strong>Stripe Sandbox</strong> (not Test Mode). Your Cashier account is{" "}
                          <code>{settings.stripe_issuing_readiness.account_id ?? resolvedStripeAccountId ?? "acct_…"}</code>.
                        </li>
                        <li>
                          Email{" "}
                          <a href="mailto:support@bridge.xyz" className="underline font-medium">
                            support@bridge.xyz
                          </a>{" "}
                          or check the Bridge Dashboard for your <strong>Stripe App Install Link</strong>.
                        </li>
                        <li>Open the install link while logged into the matching Stripe Sandbox and approve the Bridge Cards app.</li>
                        <li>Return here, save settings, and click <strong>Enable Bridge Cards (Sandbox)</strong>.</li>
                      </>
                    ) : (
                      <>
                        <li>Complete Bridge cards onboarding with your Bridge implementation contact.</li>
                        <li>Install the Bridge Cards Stripe App on your <strong>live</strong> Stripe account using the install link from Bridge.</li>
                        <li>Add live Stripe keys under Settings → Stripe &amp; PayPal (account <code>{settings.stripe_issuing_readiness.account_id ?? resolvedStripeAccountId ?? "acct_…"}</code>).</li>
                        <li>Return here and click <strong>Verify Bridge Cards Setup (Live)</strong>.</li>
                      </>
                    )}
                  </ol>
                  <p className="text-xs text-amber-700 dark:text-amber-300">
                    Docs:{" "}
                    <a
                      href={
                        bridgeEnvironment === "sandbox"
                          ? "https://apidocs.bridge.xyz/platform/cards/sandbox/sandbox"
                          : "https://apidocs.bridge.xyz/platform/cards/overview/stripe-issuing"
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline"
                    >
                      {bridgeEnvironment === "sandbox" ? "Bridge cards sandbox setup" : "Bridge consumer issuing (live)"}
                    </a>
                    {" · "}
                    <a
                      href="https://docs.stripe.com/issuing/bridge-stablecoin-cards"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline"
                    >
                      Stripe + Bridge issuing guide
                    </a>
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="bridge_stripe_app_install_url">Bridge Stripe App install link (optional)</Label>
                <Input
                  id="bridge_stripe_app_install_url"
                  type="url"
                  value={data.bridge_stripe_app_install_url}
                  onChange={(e) => setData("bridge_stripe_app_install_url", e.target.value)}
                  placeholder="https://marketplace.stripe.com/apps/install/link/..."
                  className="font-mono text-xs"
                />
                {errors.bridge_stripe_app_install_url && (
                  <p className="text-sm text-red-500 mt-1">{errors.bridge_stripe_app_install_url}</p>
                )}
                <div className="flex flex-wrap gap-2">
                  {data.bridge_stripe_app_install_url && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="text-xs"
                      onClick={() => window.open(data.bridge_stripe_app_install_url, "_blank", "noopener,noreferrer")}
                    >
                      Open Bridge App install link
                    </Button>
                  )}
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="text-xs"
                    onClick={() =>
                      window.open(
                        bridgeEnvironment === "sandbox"
                          ? "https://dashboard.stripe.com/test/issuing/overview"
                          : "https://dashboard.stripe.com/issuing/overview",
                        "_blank",
                        "noopener,noreferrer"
                      )
                    }
                  >
                    Open Stripe Issuing dashboard
                  </Button>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Paste the install URL from Bridge support. After installing, refresh this page to confirm Issuing is active.
                </p>
              </div>

              {settings.bridge_cards_enabled_at && (
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-md border border-green-200 dark:border-green-800 space-y-1">
                  <p className="text-sm font-medium text-green-700 dark:text-green-300">
                    ✓ Bridge cards product enabled
                  </p>
                  <p className="text-xs text-green-600 dark:text-green-400">
                    Enabled at {new Date(settings.bridge_cards_enabled_at).toLocaleString()}
                    {settings.bridge_cards_enable_stripe_account_id && (
                      <> · Stripe account <code>{settings.bridge_cards_enable_stripe_account_id}</code></>
                    )}
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label>Cashier Stripe account (resolved)</Label>
                <Input
                  readOnly
                  value={resolvedStripeAccountId || "Not available — configure Stripe keys or set an override below"}
                  className="font-mono text-sm bg-muted"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Retrieved from your Cashier Stripe secret key via the Stripe API. Override only if Bridge requires a specific Connect account ID.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bridge_stripe_account_override">
                  Stripe account ID override ({bridgeEnvironment})
                </Label>
                <Input
                  id="bridge_stripe_account_override"
                  value={stripeOverride}
                  onChange={(e) =>
                    setData(
                      bridgeEnvironment === "sandbox"
                        ? "bridge_sandbox_stripe_account_id"
                        : "bridge_live_stripe_account_id",
                      e.target.value
                    )
                  }
                  placeholder="acct_..."
                  className="font-mono text-sm"
                />
                {(errors.bridge_sandbox_stripe_account_id || errors.bridge_live_stripe_account_id) && (
                  <p className="text-sm text-red-500 mt-1">
                    {errors.bridge_sandbox_stripe_account_id || errors.bridge_live_stripe_account_id}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="bridge_cards_program_type">Cards program type</Label>
                <Select
                  value={data.bridge_cards_program_type}
                  onValueChange={(value) => setData("bridge_cards_program_type", value)}
                >
                  <SelectTrigger id="bridge_cards_program_type">
                    <SelectValue placeholder="Select program type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="consumer">Consumer</SelectItem>
                    <SelectItem value="commercial">Commercial</SelectItem>
                  </SelectContent>
                </Select>
                {errors.bridge_cards_program_type && (
                  <p className="text-sm text-red-500 mt-1">{errors.bridge_cards_program_type}</p>
                )}
              </div>

              {(bridgeEnvironment === "sandbox" || bridgeEnvironment === "live") && (
                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={
                      enablingCards ||
                      !settings.stripe_cashier_configured ||
                      !settings.stripe_issuing_readiness.issuing_enabled
                    }
                    onClick={handleEnableCards}
                    className="w-full sm:w-auto"
                  >
                    {enablingCards ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {bridgeEnvironment === "sandbox" ? "Enabling…" : "Verifying…"}
                      </>
                    ) : (
                      <>
                        <CreditCard className="mr-2 h-4 w-4" />
                        {bridgeEnvironment === "sandbox"
                          ? "Enable Bridge Cards (Sandbox)"
                          : "Verify Bridge Cards Setup (Live)"}
                      </>
                    )}
                  </Button>
                  <p className="text-xs text-gray-500 dark:text-gray-400 self-center">
                    {bridgeEnvironment === "sandbox" ? (
                      <>
                        Saves program type when you click Save Settings. Enable calls Bridge <code>POST /cards/enable</code> with your Cashier Stripe account.
                      </>
                    ) : (
                      <>
                        Live mode verifies Stripe Issuing on your production account (no Bridge <code>/cards/enable</code> API). Customers still need an approved <code>cards</code> endorsement.
                      </>
                    )}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

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

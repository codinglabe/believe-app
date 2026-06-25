"use client"

import React from "react"
import { Head, Link, router, useForm } from "@inertiajs/react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Checkbox } from "@/components/ui/checkbox"
import { showErrorToast } from "@/lib/toast"
import {
  CreditCard,
  Loader2,
  Settings,
  Webhook,
  Coins,
  CheckCircle2,
  Info,
  ExternalLink,
} from "lucide-react"
import SettingsLayout from "@/layouts/settings/layout"
import { cn } from "@/lib/utils"
import { BridgeSection } from "@/pages/settings/bridge/components/BridgeSection"
import { BridgeStatusStrip, type BridgeEnvIntegrationStatus } from "@/pages/settings/bridge/components/BridgeStatusStrip"
import { SecretInput } from "@/pages/settings/bridge/components/SecretInput"
import { BridgeField } from "@/pages/settings/bridge/components/BridgeField"
import {
  PrefundedLiquidityPicker,
  type PrefundedLiquidityOptions,
} from "@/pages/settings/bridge/components/PrefundedLiquidityPicker"

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
  believe_points_wallet_transfer_enabled?: boolean
  believe_points_wallet_transfer_min?: number
  believe_points_wallet_transfer_max?: number
  sandbox_prefunded_customer_id?: string | null
  sandbox_prefunded_wallet_id?: string | null
  sandbox_prefunded_account_id?: string | null
  sandbox_prefunded_account_name?: string | null
  live_prefunded_customer_id?: string | null
  live_prefunded_wallet_id?: string | null
  live_prefunded_account_id?: string | null
  live_prefunded_account_name?: string | null
  app_url: string
  integration_overview: {
    active_environment: "sandbox" | "live"
    sandbox: BridgeEnvIntegrationStatus
    live: BridgeEnvIntegrationStatus
  }
}

interface Props {
  settings: SettingsProps
  prefunded_liquidity_options?: PrefundedLiquidityOptions | null
  live_prefunded_balance?: {
    name: string
    available_balance: string
    currency: string
  } | null
}

function formatPrefundedBalance(amount: string, currency: string): string {
  const value = Number.parseFloat(amount)
  if (Number.isNaN(value)) {
    return amount
  }

  if (currency.toLowerCase() === "usd") {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value)
  }

  return `${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })} ${currency.toUpperCase()}`
}

function WebhookConfiguredBanner({
  webhookId,
  publicKey,
}: {
  webhookId: string
  publicKey?: string | null
}) {
  return (
    <Alert className="border-emerald-200 bg-emerald-50/80 dark:border-emerald-900/50 dark:bg-emerald-950/30">
      <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
      <AlertDescription className="space-y-1 text-emerald-900 dark:text-emerald-100">
        <p className="font-medium">Webhook configured and active</p>
        <p className="text-xs font-mono opacity-90">ID: {webhookId}</p>
        {publicKey && (
          <p className="break-all text-xs font-mono opacity-80">
            Public key: {publicKey.substring(0, 48)}…
          </p>
        )}
      </AlertDescription>
    </Alert>
  )
}

export default function BridgeSettings({ settings, live_prefunded_balance }: Props) {
  const defaultWebhookUrl = settings.app_url
    ? `${settings.app_url}/webhooks/bridge`
    : typeof window !== "undefined"
      ? `${window.location.origin}/webhooks/bridge`
      : "/webhooks/bridge"

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
    believe_points_wallet_transfer_enabled: settings.believe_points_wallet_transfer_enabled ?? false,
    believe_points_wallet_transfer_min: settings.believe_points_wallet_transfer_min ?? 1,
    believe_points_wallet_transfer_max: settings.believe_points_wallet_transfer_max ?? 10000,
    sandbox_prefunded_customer_id: settings.sandbox_prefunded_customer_id || "",
    sandbox_prefunded_wallet_id: settings.sandbox_prefunded_wallet_id || "",
    sandbox_prefunded_account_id: settings.sandbox_prefunded_account_id || "",
    sandbox_prefunded_account_name: settings.sandbox_prefunded_account_name || "",
    live_prefunded_customer_id: settings.live_prefunded_customer_id || "",
    live_prefunded_wallet_id: settings.live_prefunded_wallet_id || "",
    live_prefunded_account_id: settings.live_prefunded_account_id || "",
    live_prefunded_account_name: settings.live_prefunded_account_name || "",
  })

  const [enablingCards, setEnablingCards] = React.useState(false)
  const [bridgeEnvironment, setBridgeEnvironment] = React.useState<"sandbox" | "live">(
    settings.bridge_mode_environment || "sandbox",
  )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    post("/settings/bridge", {
      onError: () => {
        showErrorToast("Failed to update settings. Please check the form.")
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
      },
    )
  }

  const resolvedStripeAccountId = settings.bridge_resolved_stripe_account_id
  const stripeOverride =
    bridgeEnvironment === "sandbox"
      ? data.bridge_sandbox_stripe_account_id
      : data.bridge_live_stripe_account_id

  const webhookId =
    bridgeEnvironment === "sandbox" ? settings.bridge_sandbox_webhook_id : settings.bridge_live_webhook_id
  const webhookPublicKey =
    bridgeEnvironment === "sandbox"
      ? settings.bridge_sandbox_webhook_public_key
      : settings.bridge_live_webhook_public_key

  const webhookOrigin =
    typeof window !== "undefined" ? window.location.origin : settings.app_url || "https://your-domain.com"

  const envStatus = settings.integration_overview[bridgeEnvironment]

  return (
    <SettingsLayout
      activeTab="bridge"
      pageTitle="Bridge Wallet"
      pageSubtitle="Admin configuration for Bridge API, webhooks, cards, and Believe Points liquidity."
    >
      <Head title="Bridge Wallet Settings" />

      <form onSubmit={handleSubmit} className="space-y-6">
        <BridgeStatusStrip
          viewingEnvironment={bridgeEnvironment}
          activeEnvironment={settings.integration_overview.active_environment}
          status={envStatus}
        />

        <div className="rounded-xl border border-border/60 bg-muted/30 p-1.5">
          <div className="grid grid-cols-2 gap-1">
            {(["sandbox", "live"] as const).map((env) => (
              <button
                key={env}
                type="button"
                onClick={() => {
                  setBridgeEnvironment(env)
                  setData("bridge_mode_environment", env)
                }}
                className={cn(
                  "rounded-lg px-4 py-2.5 text-sm font-medium transition-all",
                  bridgeEnvironment === env
                    ? "bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-sm"
                    : "text-muted-foreground hover:bg-background/80 hover:text-foreground",
                )}
              >
                {env === "sandbox" ? "Sandbox (test)" : "Live (production)"}
              </button>
            ))}
          </div>
        </div>

        <BridgeSection
          icon={Webhook}
          title="API credentials & webhooks"
          description="Bridge API keys and webhook endpoint. Saving creates or activates the webhook automatically."
        >
          {webhookId && (
            <WebhookConfiguredBanner webhookId={webhookId} publicKey={webhookPublicKey} />
          )}

          {bridgeEnvironment === "sandbox" ? (
            <div className="grid gap-5 lg:grid-cols-2">
              <SecretInput
                id="bridge_sandbox_api_key"
                label="Sandbox API key"
                value={data.bridge_sandbox_api_key}
                onChange={(v) => setData("bridge_sandbox_api_key", v)}
                placeholder="sk-test-…"
                hint="From your Bridge dashboard (sandbox)."
                error={errors.bridge_sandbox_api_key}
              />
              <BridgeField
                id="bridge_sandbox_webhook_url"
                label="Webhook URL"
                value={data.bridge_sandbox_webhook_url}
                onChange={(v) => setData("bridge_sandbox_webhook_url", v)}
                placeholder="https://your-domain.com/webhooks/bridge"
                hint="Use ngrok or similar for local development."
                error={errors.bridge_sandbox_webhook_url}
              />
              <BridgeField
                id="bridge_sandbox_badge_url"
                label="Badge URL"
                value={data.bridge_sandbox_badge_url}
                onChange={(v) => setData("bridge_sandbox_badge_url", v)}
                placeholder="https://your-domain.com/badge.png"
                hint="Image shown in Bridge wallet interfaces."
                error={errors.bridge_sandbox_badge_url}
                className="lg:col-span-2"
              />
            </div>
          ) : (
            <div className="grid gap-5 lg:grid-cols-2">
              <SecretInput
                id="bridge_live_api_key"
                label="Live API key"
                value={data.bridge_live_api_key}
                onChange={(v) => setData("bridge_live_api_key", v)}
                placeholder="sk-live-…"
                hint="Production Bridge API key."
                error={errors.bridge_live_api_key}
              />
              <BridgeField
                id="bridge_live_badge_url"
                label="Badge URL"
                value={data.bridge_live_badge_url}
                onChange={(v) => setData("bridge_live_badge_url", v)}
                placeholder="https://your-domain.com/badge.png"
                hint="Image shown in Bridge wallet interfaces."
                error={errors.bridge_live_badge_url}
              />
            </div>
          )}

          <Alert className="border-blue-200/80 bg-blue-50/50 dark:border-blue-900/40 dark:bg-blue-950/20">
            <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <AlertDescription className="text-sm text-blue-900 dark:text-blue-100">
              On save, the app registers{" "}
              <code className="rounded bg-blue-100/80 px-1 py-0.5 text-xs dark:bg-blue-900/40">
                {webhookOrigin}/webhooks/bridge
              </code>
              , subscribes to Bridge events, stores the webhook ID and public key for signature verification.
            </AlertDescription>
          </Alert>
        </BridgeSection>

        <BridgeSection
          icon={CreditCard}
          title="Bridge cards & Stripe Issuing"
          description={
            bridgeEnvironment === "sandbox"
              ? "Sandbox cards require a linked Stripe Sandbox account and Bridge POST /cards/enable."
              : "Live cards use Stripe Issuing on your production account after Bridge onboarding."
          }
        >
          {!settings.stripe_cashier_configured && (
            <Alert className="border-amber-200 bg-amber-50/80 dark:border-amber-900/50 dark:bg-amber-950/30">
              <AlertDescription className="text-sm text-amber-900 dark:text-amber-100">
                Stripe is not configured. Add Cashier keys under{" "}
                <Link href="/settings/payment-methods" className="font-medium underline underline-offset-2">
                  Stripe &amp; PayPal
                </Link>{" "}
                first.
              </AlertDescription>
            </Alert>
          )}

          {settings.stripe_issuing_readiness.issuing_enabled ? (
            <Alert className="border-emerald-200 bg-emerald-50/80 dark:border-emerald-900/50 dark:bg-emerald-950/30">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <AlertDescription className="text-sm text-emerald-900 dark:text-emerald-100">
                {settings.stripe_issuing_readiness.message}
                {settings.stripe_issuing_readiness.account_id && (
                  <> · <code className="text-xs">{settings.stripe_issuing_readiness.account_id}</code></>
                )}
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-3 rounded-xl border border-amber-200/80 bg-amber-50/50 p-4 dark:border-amber-900/40 dark:bg-amber-950/20">
              <p className="text-sm font-medium text-amber-950 dark:text-amber-100">
                Stripe Issuing not active yet
              </p>
              <p className="text-xs leading-relaxed text-amber-900/90 dark:text-amber-200/90">
                {settings.stripe_issuing_readiness.message}
              </p>
              <ol className="list-decimal space-y-1.5 pl-4 text-xs text-amber-900 dark:text-amber-200">
                {bridgeEnvironment === "sandbox" ? (
                  <>
                    <li>
                      Use a Stripe Sandbox (account{" "}
                      <code>{settings.stripe_issuing_readiness.account_id ?? resolvedStripeAccountId ?? "acct_…"}</code>
                      ).
                    </li>
                    <li>Get the Bridge Cards Stripe App install link from Bridge support.</li>
                    <li>Install the app in the matching Stripe Sandbox, then enable cards below.</li>
                  </>
                ) : (
                  <>
                    <li>Complete Bridge cards onboarding with your Bridge contact.</li>
                    <li>Install the Bridge Cards Stripe App on your live Stripe account.</li>
                    <li>Add live Stripe keys, then verify setup below.</li>
                  </>
                )}
              </ol>
              <div className="flex flex-wrap gap-2 pt-1">
                <a
                  href={
                    bridgeEnvironment === "sandbox"
                      ? "https://apidocs.bridge.xyz/platform/cards/sandbox/sandbox"
                      : "https://apidocs.bridge.xyz/platform/cards/overview/stripe-issuing"
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-medium text-amber-900 underline dark:text-amber-200"
                >
                  Bridge docs <ExternalLink className="h-3 w-3" />
                </a>
                <a
                  href="https://docs.stripe.com/issuing/bridge-stablecoin-cards"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-medium text-amber-900 underline dark:text-amber-200"
                >
                  Stripe + Bridge guide <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          )}

          {settings.bridge_cards_enabled_at && (
            <Alert className="border-emerald-200 bg-emerald-50/80 dark:border-emerald-900/50 dark:bg-emerald-950/30">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <AlertDescription className="text-sm text-emerald-900 dark:text-emerald-100">
                Cards product enabled {new Date(settings.bridge_cards_enabled_at).toLocaleString()}
                {settings.bridge_cards_enable_stripe_account_id && (
                  <> · Stripe <code className="text-xs">{settings.bridge_cards_enable_stripe_account_id}</code></>
                )}
              </AlertDescription>
            </Alert>
          )}

          <div className="grid gap-5 lg:grid-cols-2">
            <BridgeField
              id="bridge_stripe_app_install_url"
              label="Bridge Stripe App install link (optional)"
              value={data.bridge_stripe_app_install_url}
              onChange={(v) => setData("bridge_stripe_app_install_url", v)}
              placeholder="https://marketplace.stripe.com/apps/install/link/…"
              hint="Paste from Bridge support; open after installing in Stripe."
              error={errors.bridge_stripe_app_install_url}
              className="lg:col-span-2"
            />

            <BridgeField
              id="bridge_stripe_account_resolved"
              label="Cashier Stripe account (resolved)"
              value={resolvedStripeAccountId || "Not available — configure Stripe keys or override"}
              readOnly
            />

            <BridgeField
              id="bridge_stripe_account_override"
              label={`Stripe account override (${bridgeEnvironment})`}
              value={stripeOverride}
              onChange={(v) =>
                setData(
                  bridgeEnvironment === "sandbox"
                    ? "bridge_sandbox_stripe_account_id"
                    : "bridge_live_stripe_account_id",
                  v,
                )
              }
              placeholder="acct_…"
              error={errors.bridge_sandbox_stripe_account_id || errors.bridge_live_stripe_account_id}
            />

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
                <p className="text-sm text-destructive">{errors.bridge_cards_program_type}</p>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-3 border-t border-border/60 pt-5 sm:flex-row sm:items-center">
            <div className="flex flex-wrap gap-2">
              {data.bridge_stripe_app_install_url && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => window.open(data.bridge_stripe_app_install_url, "_blank", "noopener,noreferrer")}
                >
                  Open install link
                </Button>
              )}
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() =>
                  window.open(
                    bridgeEnvironment === "sandbox"
                      ? "https://dashboard.stripe.com/test/issuing/overview"
                      : "https://dashboard.stripe.com/issuing/overview",
                    "_blank",
                    "noopener,noreferrer",
                  )
                }
              >
                Stripe Issuing dashboard
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={
                  enablingCards ||
                  !settings.stripe_cashier_configured ||
                  !settings.stripe_issuing_readiness.issuing_enabled
                }
                onClick={handleEnableCards}
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
                      : "Verify Bridge Cards (Live)"}
                  </>
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground sm:max-w-md">
              {bridgeEnvironment === "sandbox"
                ? "Calls Bridge POST /cards/enable with your Cashier Stripe account after you save program type."
                : "Live mode verifies Stripe Issuing only — no Bridge /cards/enable API."}
            </p>
          </div>
        </BridgeSection>

        <BridgeSection
          icon={Coins}
          title="Believe Points → Wallet"
          description="Platform reserve liquidity when users move purchased BP into their verified wallet."
        >
          <div className="flex items-start gap-3 rounded-xl border bg-muted/30 p-4">
            <Checkbox
              id="believe_points_wallet_transfer_enabled"
              checked={data.believe_points_wallet_transfer_enabled}
              onCheckedChange={(checked) =>
                setData("believe_points_wallet_transfer_enabled", checked === true)
              }
              className="mt-1"
            />
            <div className="space-y-1">
              <Label htmlFor="believe_points_wallet_transfer_enabled" className="cursor-pointer font-medium">
                Enable BP → Wallet transfers
              </Label>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Requires a live platform reserve customer wallet in production. Only purchased BP can be moved (not gifted).
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <BridgeField
              id="believe_points_wallet_transfer_min"
              label="Minimum transfer (USD)"
              type="number"
              value={String(data.believe_points_wallet_transfer_min)}
              onChange={(v) => setData("believe_points_wallet_transfer_min", Number(v))}
            />
            <BridgeField
              id="believe_points_wallet_transfer_max"
              label="Maximum transfer (USD)"
              type="number"
              value={String(data.believe_points_wallet_transfer_max)}
              onChange={(v) => setData("believe_points_wallet_transfer_max", Number(v))}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <PrefundedLiquidityPicker
              environment="sandbox"
              title="Sandbox reserve account"
              customerId={data.sandbox_prefunded_customer_id}
              walletId={data.sandbox_prefunded_wallet_id}
              accountId={data.sandbox_prefunded_account_id}
              accountName={data.sandbox_prefunded_account_name}
              onCustomerIdChange={(value) => setData("sandbox_prefunded_customer_id", value)}
              onWalletIdChange={(value) => setData("sandbox_prefunded_wallet_id", value)}
              onAccountIdChange={(value) => setData("sandbox_prefunded_account_id", value)}
              onAccountNameChange={(value) => setData("sandbox_prefunded_account_name", value)}
            />

            <PrefundedLiquidityPicker
              environment="live"
              title="Live reserve account"
              className="border-purple-200/60 bg-purple-50/30 dark:border-purple-900/40 dark:bg-purple-950/15"
              customerId={data.live_prefunded_customer_id}
              walletId={data.live_prefunded_wallet_id}
              accountId={data.live_prefunded_account_id}
              accountName={data.live_prefunded_account_name}
              onCustomerIdChange={(value) => setData("live_prefunded_customer_id", value)}
              onWalletIdChange={(value) => setData("live_prefunded_wallet_id", value)}
              onAccountIdChange={(value) => setData("live_prefunded_account_id", value)}
              onAccountNameChange={(value) => setData("live_prefunded_account_name", value)}
            />
          </div>

          {live_prefunded_balance && (
            <Alert className="border-purple-200/70 bg-purple-50/40 dark:border-purple-900/40 dark:bg-purple-950/20">
              <Info className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              <AlertDescription className="text-sm text-foreground">
                <span className="font-medium">{live_prefunded_balance.name}</span> reserve available balance:{" "}
                <span className="font-semibold tabular-nums">
                  {formatPrefundedBalance(
                    live_prefunded_balance.available_balance,
                    live_prefunded_balance.currency,
                  )}
                </span>
                . Checked via Bridge reserve wallet balance.
              </AlertDescription>
            </Alert>
          )}
        </BridgeSection>

        <div className="sticky bottom-4 z-10 flex flex-col gap-3 rounded-xl border border-border/60 bg-card/95 p-4 shadow-lg backdrop-blur sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            Saving updates <span className="font-medium capitalize">{bridgeEnvironment}</span> credentials and webhooks.
          </p>
          <Button
            type="submit"
            disabled={processing}
            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700 sm:w-auto"
          >
            {processing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving…
              </>
            ) : (
              <>
                <Settings className="mr-2 h-4 w-4" />
                Save Bridge settings
              </>
            )}
          </Button>
        </div>
      </form>
    </SettingsLayout>
  )
}

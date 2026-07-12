import type { LucideIcon } from "lucide-react"
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Landmark,
} from "lucide-react"

export interface StripeConnectOrganization {
  name: string
  stripe_connect_account_id: string | null
  stripe_connect_charges_enabled: boolean
  stripe_connect_payouts_enabled: boolean
  stripe_connect_account_type: string | null
  email: string | null
}

export interface StripeConnectPageProps {
  organization: StripeConnectOrganization
  requireConnectForPublicDonations: boolean
  stripeConfigured: boolean
  isLegacyExpressAccount: boolean
  syncError: string | null
  connectError: string | null
}

export type ConnectStatus = "ready" | "in_progress" | "legacy" | "not_connected"

export interface StatusMeta {
  label: string
  tone: string
  icon: LucideIcon
  title: string
  description: string
}

export function resolveConnectStatus(input: {
  isLegacyExpressAccount: boolean
  chargesEnabled: boolean
  payoutsEnabled: boolean
  hasAccount: boolean
}): ConnectStatus {
  if (input.isLegacyExpressAccount) {
    return "legacy"
  }

  const ready = input.chargesEnabled && input.payoutsEnabled
  if (ready) {
    return "ready"
  }

  if (input.hasAccount) {
    return "in_progress"
  }

  return "not_connected"
}

export function getStatusMeta(
  status: ConnectStatus,
  requireConnectForPublicDonations: boolean,
): StatusMeta {
  switch (status) {
    case "ready":
      return {
        label: "Ready",
        tone: "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300",
        icon: CheckCircle2,
        title: "Standard Stripe account connected",
        description:
          "Qualifying one-time gifts can settle directly to your nonprofit’s Stripe balance.",
      }
    case "in_progress":
      return {
        label: "Setup in progress",
        tone: "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200",
        icon: AlertCircle,
        title: "Finish your Stripe onboarding",
        description:
          "Your account is linked, but Stripe still needs details before charges or payouts can go live.",
      }
    case "legacy":
      return {
        label: "Reconnect required",
        tone: "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200",
        icon: AlertTriangle,
        title: "Legacy Express account detected",
        description:
          "Express accounts are no longer supported. Disconnect, then connect a Standard account.",
      }
    default:
      return {
        label: "Not connected",
        tone: "border-border bg-muted/60 text-muted-foreground",
        icon: Landmark,
        title: "Connect your Standard Stripe account",
        description: requireConnectForPublicDonations
          ? "Standard Connect is required before accepting direct card or bank gifts to your listing."
          : "Until connected, donors may use the legacy platform checkout path when available.",
      }
  }
}

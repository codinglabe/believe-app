"use client"

import AppLayout from "@/layouts/app-layout"
import { Head, router, usePage } from "@inertiajs/react"
import { useState, type MouseEvent } from "react"
import { ConfirmationModal } from "@/components/confirmation-modal"
import {
  getStatusMeta,
  resolveConnectStatus,
  StripeConnectAdminNote,
  StripeConnectAlerts,
  StripeConnectHeader,
  StripeConnectMainPanel,
  StripeConnectNav,
  StripeConnectPageShell,
  type StripeConnectPageProps,
} from "@/components/integrations/stripe-connect"

interface InertiaPageErrors {
  stripe?: string
  [key: string]: string | undefined
}

export default function StripeDonations({
  organization,
  requireConnectForPublicDonations,
  stripeConfigured,
  isLegacyExpressAccount,
  syncError,
  connectError,
}: StripeConnectPageProps) {
  const { errors, flash } = usePage().props as {
    errors?: InertiaPageErrors
    flash?: { success?: string; error?: string }
  }
  const [submitting, setSubmitting] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)
  const [disconnectModalOpen, setDisconnectModalOpen] = useState(false)

  const hasAccount = !!organization.stripe_connect_account_id
  const status = resolveConnectStatus({
    isLegacyExpressAccount,
    chargesEnabled: organization.stripe_connect_charges_enabled,
    payoutsEnabled: organization.stripe_connect_payouts_enabled,
    hasAccount,
  })
  const statusMeta = getStatusMeta(status, requireConnectForPublicDonations)
  const ready = status === "ready"
  const inlineError = connectError || errors?.stripe || syncError || flash?.error || null
  const startUrl = route("integrations.stripe-connect.start")

  const primaryCtaLabel = submitting
    ? "Redirecting…"
    : hasAccount && !isLegacyExpressAccount
      ? "Continue Stripe setup"
      : "Connect Standard Stripe account"

  const handleStart = (e: MouseEvent<HTMLAnchorElement>) => {
    if (!stripeConfigured || isLegacyExpressAccount) {
      e.preventDefault()
      return
    }
    setSubmitting(true)
  }

  const confirmDisconnect = () => {
    setDisconnecting(true)
    router.post(route("integrations.stripe-connect.disconnect"), {}, {
      onFinish: () => setDisconnecting(false),
    })
  }

  return (
    <AppLayout>
      <Head title="Stripe Connect — donation payouts" />
      <StripeConnectPageShell>
        <StripeConnectNav />
        <StripeConnectHeader
          organizationName={organization.name}
          statusMeta={statusMeta}
        />
        <StripeConnectAlerts
          successMessage={flash?.success}
          isLegacyExpressAccount={isLegacyExpressAccount}
          stripeConfigured={stripeConfigured}
          inlineError={inlineError}
        />
        <StripeConnectMainPanel
          organization={organization}
          statusMeta={statusMeta}
          hasAccount={hasAccount}
          ready={ready}
          isLegacyExpressAccount={isLegacyExpressAccount}
          stripeConfigured={stripeConfigured}
          submitting={submitting}
          disconnecting={disconnecting}
          primaryCtaLabel={primaryCtaLabel}
          startUrl={startUrl}
          onStart={handleStart}
          onDisconnect={() => setDisconnectModalOpen(true)}
        />
        <StripeConnectAdminNote />
      </StripeConnectPageShell>

      <ConfirmationModal
        isOpen={disconnectModalOpen}
        onChange={setDisconnectModalOpen}
        title="Disconnect Stripe account?"
        description="This removes the Stripe Connect link from BIU. You can reconnect with a Standard Stripe account afterward. Your Stripe account itself is not deleted."
        confirmLabel="Disconnect Stripe"
        cancelLabel="Keep connected"
        isLoading={disconnecting}
        onConfirm={confirmDisconnect}
      />
    </AppLayout>
  )
}

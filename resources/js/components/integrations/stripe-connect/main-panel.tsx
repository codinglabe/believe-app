import type { MouseEvent } from "react"
import { Link } from "@inertiajs/react"
import { ArrowRight, Landmark, Link2, Loader2, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  StripeConnectAccountDetails,
  StripeConnectCapabilities,
  StripeConnectDashboardNote,
  StripeConnectMoneyFlow,
} from "./details"
import type { StatusMeta, StripeConnectOrganization } from "./types"

export function StripeConnectActions({
  isLegacyExpressAccount,
  stripeConfigured,
  hasAccount,
  submitting,
  disconnecting,
  primaryCtaLabel,
  startUrl,
  onStart,
  onDisconnect,
}: {
  isLegacyExpressAccount: boolean
  stripeConfigured: boolean
  hasAccount: boolean
  submitting: boolean
  disconnecting: boolean
  primaryCtaLabel: string
  startUrl: string
  onStart: (e: MouseEvent<HTMLAnchorElement>) => void
  onDisconnect: () => void
}) {
  const canConnect = !isLegacyExpressAccount && stripeConfigured
  const notConnectedYet = !hasAccount && !isLegacyExpressAccount

  if (notConnectedYet) {
    return (
      <div className="space-y-3">
        <div className="rounded-2xl border border-purple-200/70 bg-gradient-to-br from-purple-600/[0.08] via-blue-600/[0.05] to-transparent p-4 dark:border-purple-800/50">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-purple-600 to-blue-600 text-white shadow-sm shadow-purple-600/25">
              <Link2 className="h-4 w-4" aria-hidden />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Not connected yet</p>
              <p className="text-xs text-muted-foreground">
                Takes a few minutes in Stripe — you keep full Dashboard access.
              </p>
            </div>
          </div>

          <Button
            asChild
            disabled={submitting || !stripeConfigured}
            className="h-12 w-full rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 px-5 text-base font-semibold text-white shadow-lg shadow-purple-600/25 hover:from-purple-700 hover:to-blue-700 disabled:opacity-60"
          >
            <a
              href={startUrl}
              onClick={onStart}
              aria-disabled={submitting || !stripeConfigured}
              className={!stripeConfigured ? "pointer-events-none" : ""}
            >
              {submitting ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" aria-hidden />
              ) : (
                <Sparkles className="mr-2 h-5 w-5" aria-hidden />
              )}
              {primaryCtaLabel}
              {!submitting ? <ArrowRight className="ml-2 h-4 w-4" aria-hidden /> : null}
            </a>
          </Button>

          {!stripeConfigured ? (
            <p className="mt-2 text-center text-xs text-red-600 dark:text-red-400">
              Stripe keys are not configured on this platform yet.
            </p>
          ) : (
            <p className="mt-2 text-center text-xs text-muted-foreground">
              You’ll be redirected to Stripe to finish setup securely.
            </p>
          )}
        </div>

        <Button variant="ghost" asChild className="h-10 w-full rounded-xl text-muted-foreground">
          <Link href={route("integrations.payout-settings")}>Other payout methods</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3 border-t border-border/70 pt-5 sm:flex-row sm:flex-wrap sm:items-center">
      {canConnect ? (
        <Button
          asChild
          disabled={submitting || !stripeConfigured}
          className="h-11 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 px-5 text-white shadow-md shadow-purple-600/20 hover:from-purple-700 hover:to-blue-700 disabled:opacity-60"
        >
          <a
            href={startUrl}
            onClick={onStart}
            aria-disabled={submitting || !stripeConfigured}
            className={!stripeConfigured ? "pointer-events-none" : ""}
          >
            {submitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <ArrowRight className="mr-2 h-4 w-4" aria-hidden />
            )}
            {primaryCtaLabel}
          </a>
        </Button>
      ) : null}

      {hasAccount ? (
        <Button
          type="button"
          variant="outline"
          disabled={disconnecting}
          onClick={onDisconnect}
          className="h-11 rounded-xl"
        >
          {disconnecting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
              Disconnecting…
            </>
          ) : (
            "Disconnect Stripe"
          )}
        </Button>
      ) : null}

      <Button variant="ghost" asChild className="h-11 rounded-xl text-muted-foreground">
        <Link href={route("integrations.payout-settings")}>Other payout methods</Link>
      </Button>
    </div>
  )
}

export function StripeConnectMainPanel({
  organization,
  statusMeta,
  hasAccount,
  ready,
  isLegacyExpressAccount,
  stripeConfigured,
  submitting,
  disconnecting,
  primaryCtaLabel,
  startUrl,
  onStart,
  onDisconnect,
}: {
  organization: StripeConnectOrganization
  statusMeta: StatusMeta
  hasAccount: boolean
  ready: boolean
  isLegacyExpressAccount: boolean
  stripeConfigured: boolean
  submitting: boolean
  disconnecting: boolean
  primaryCtaLabel: string
  startUrl: string
  onStart: (e: MouseEvent<HTMLAnchorElement>) => void
  onDisconnect: () => void
}) {
  const notConnectedYet = !hasAccount && !isLegacyExpressAccount

  return (
    <section className="overflow-hidden rounded-2xl border border-border/80 bg-card/90 shadow-sm backdrop-blur">
      <div className="border-b border-border/70 bg-gradient-to-r from-purple-600/[0.06] to-blue-600/[0.06] px-6 py-5 sm:px-8">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-600 to-blue-600 text-white shadow-md shadow-purple-600/20">
              <Landmark className="h-6 w-6" aria-hidden />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">{statusMeta.title}</h2>
              <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                {statusMeta.description}
              </p>
            </div>
          </div>
          <StripeConnectCapabilities
            hasAccount={hasAccount}
            chargesEnabled={organization.stripe_connect_charges_enabled}
            payoutsEnabled={organization.stripe_connect_payouts_enabled}
          />
        </div>
      </div>

      <div className="grid gap-6 px-6 py-6 lg:grid-cols-12 lg:gap-8 sm:px-8">
        <div className="space-y-6 lg:col-span-7">
          <StripeConnectMoneyFlow />
          <StripeConnectDashboardNote ready={ready} />
        </div>

        <div className="space-y-5 lg:col-span-5 lg:border-l lg:border-border/70 lg:pl-8">
          {!notConnectedYet ? (
            <div>
              <p className="text-sm font-semibold text-foreground">Next step</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {isLegacyExpressAccount
                  ? "Disconnect the legacy Express account, then connect Standard Stripe."
                  : ready
                    ? "Your account is ready. Open Stripe anytime to manage payouts."
                    : "Continue onboarding in Stripe to enable charges and payouts."}
              </p>
            </div>
          ) : null}

          <StripeConnectActions
            isLegacyExpressAccount={isLegacyExpressAccount}
            stripeConfigured={stripeConfigured}
            hasAccount={hasAccount}
            submitting={submitting}
            disconnecting={disconnecting}
            primaryCtaLabel={primaryCtaLabel}
            startUrl={startUrl}
            onStart={onStart}
            onDisconnect={onDisconnect}
          />

          <StripeConnectAccountDetails
            accountId={organization.stripe_connect_account_id}
            accountType={organization.stripe_connect_account_type}
            email={organization.email}
          />
        </div>
      </div>
    </section>
  )
}

export function StripeConnectAdminNote() {
  return (
    <p className="mt-6 text-center text-xs leading-relaxed text-muted-foreground">
      Platform admins: enable Stripe Connect at{" "}
      <a
        href="https://dashboard.stripe.com/connect"
        target="_blank"
        rel="noopener noreferrer"
        className="underline underline-offset-2"
      >
        dashboard.stripe.com/connect
      </a>
      , using the same keys configured under Settings → Payment Methods.
    </p>
  )
}

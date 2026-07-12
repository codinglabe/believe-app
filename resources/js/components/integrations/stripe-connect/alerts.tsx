import type { ReactNode } from "react"
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
} from "lucide-react"

function AlertFrame({
  tone,
  icon,
  title,
  children,
}: {
  tone: "success" | "warning" | "danger"
  icon: ReactNode
  title?: string
  children: ReactNode
}) {
  const tones = {
    success:
      "border-emerald-200 bg-emerald-50/90 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200",
    warning:
      "border-amber-200 bg-amber-50/90 dark:border-amber-800 dark:bg-amber-950/40",
    danger:
      "border-red-200 bg-red-50/90 dark:border-red-800 dark:bg-red-950/40",
  }

  return (
    <div className={`flex items-start gap-3 rounded-xl border px-4 py-3 shadow-sm ${tones[tone]}`}>
      {icon}
      <div className="min-w-0 flex-1 text-sm">
        {title ? <p className="font-semibold">{title}</p> : null}
        <div className={title ? "mt-1" : undefined}>{children}</div>
      </div>
    </div>
  )
}

export function StripeConnectAlerts({
  successMessage,
  isLegacyExpressAccount,
  stripeConfigured,
  inlineError,
}: {
  successMessage?: string | null
  isLegacyExpressAccount: boolean
  stripeConfigured: boolean
  inlineError: string | null
}) {
  return (
    <div className="mb-6 space-y-3">
      {successMessage ? (
        <AlertFrame
          tone="success"
          icon={<CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />}
        >
          <p>{successMessage}</p>
        </AlertFrame>
      ) : null}

      {isLegacyExpressAccount ? (
        <AlertFrame
          tone="warning"
          icon={
            <AlertTriangle
              className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400"
              aria-hidden
            />
          }
          title="Reconnect with a Standard Stripe account"
        >
          <p className="text-amber-900/90 dark:text-amber-200/90">
            This organization is still linked to a legacy Express account. Disconnect below, then
            connect again so your nonprofit owns the full Stripe Dashboard.
          </p>
        </AlertFrame>
      ) : null}

      {!stripeConfigured ? (
        <AlertFrame
          tone="danger"
          icon={
            <AlertCircle
              className="mt-0.5 h-5 w-5 shrink-0 text-red-600 dark:text-red-400"
              aria-hidden
            />
          }
          title="Stripe is not configured for this site"
        >
          <p className="text-red-800/90 dark:text-red-200/90">
            A platform admin must add Stripe API keys under Settings → Payment Methods → Stripe
            before organizations can connect.
          </p>
        </AlertFrame>
      ) : null}

      {inlineError ? (
        <AlertFrame
          tone="danger"
          icon={
            <AlertCircle
              className="mt-0.5 h-5 w-5 shrink-0 text-red-600 dark:text-red-400"
              aria-hidden
            />
          }
          title="Stripe could not complete the request"
        >
          <p className="break-words text-red-800/90 dark:text-red-200/90">{inlineError}</p>
          {/connect/i.test(inlineError) ? (
            <a
              href="https://dashboard.stripe.com/connect"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1 font-medium text-red-900 underline underline-offset-2 dark:text-red-100"
            >
              Open Stripe Connect dashboard
              <ExternalLink className="h-3.5 w-3.5" aria-hidden />
            </a>
          ) : null}
        </AlertFrame>
      ) : null}
    </div>
  )
}

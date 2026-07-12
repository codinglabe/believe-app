import {
  Building2,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  CreditCard,
  ExternalLink,
  HandCoins,
  ShieldCheck,
  Wallet,
} from "lucide-react"

function CapabilityBadge({
  label,
  enabled,
  icon: Icon,
}: {
  label: string
  enabled: boolean
  icon: typeof CreditCard
}) {
  return (
    <div
      className={[
        "relative min-w-[148px] overflow-hidden rounded-2xl border px-3.5 py-3 shadow-sm",
        enabled
          ? "border-emerald-200/80 bg-gradient-to-br from-emerald-50 via-white to-emerald-50/40 dark:border-emerald-800/70 dark:from-emerald-950/50 dark:via-background dark:to-emerald-950/20"
          : "border-amber-200/80 bg-gradient-to-br from-amber-50 via-white to-orange-50/50 dark:border-amber-800/70 dark:from-amber-950/40 dark:via-background dark:to-orange-950/20",
      ].join(" ")}
    >
      <div
        aria-hidden
        className={[
          "pointer-events-none absolute -right-4 -top-4 h-16 w-16 rounded-full blur-2xl",
          enabled ? "bg-emerald-400/25" : "bg-amber-400/25",
        ].join(" ")}
      />
      <div className="relative flex items-center gap-3">
        <div
          className={[
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-sm",
            enabled
              ? "bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-emerald-500/25"
              : "bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-amber-500/25",
          ].join(" ")}
        >
          <Icon className="h-4 w-4" aria-hidden />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          <div className="mt-0.5 flex items-center gap-1.5">
            {enabled ? (
              <>
                <CheckCircle2
                  className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400"
                  aria-hidden
                />
                <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                  Enabled
                </span>
              </>
            ) : (
              <>
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
                </span>
                <Clock3
                  className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400"
                  aria-hidden
                />
                <span className="text-sm font-semibold text-amber-800 dark:text-amber-200">
                  Pending
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

const FLOW_STEPS = [
  {
    title: "Donor pays",
    body: "Donation amount, plus Payment Provider Fee if they choose to cover it.",
    icon: HandCoins,
    iconClass: "bg-purple-600/10 text-purple-700 dark:text-purple-300",
  },
  {
    title: "BIU fee offset",
    body: "Only the Payment Provider Fee portion stays on the platform balance. No BIU platform fee.",
    icon: ShieldCheck,
    iconClass: "bg-blue-600/10 text-blue-700 dark:text-blue-300",
  },
  {
    title: "Your nonprofit",
    body: "Receives 100% of the donation in your Standard Stripe account on your payout schedule.",
    icon: Building2,
    iconClass: "bg-emerald-600/10 text-emerald-700 dark:text-emerald-300",
  },
] as const

export function StripeConnectCapabilities({
  hasAccount,
  chargesEnabled,
  payoutsEnabled,
}: {
  hasAccount: boolean
  chargesEnabled: boolean
  payoutsEnabled: boolean
}) {
  if (!hasAccount) {
    return null
  }

  return (
    <div className="flex flex-wrap gap-3">
      <CapabilityBadge label="Charges" enabled={chargesEnabled} icon={CreditCard} />
      <CapabilityBadge label="Payouts" enabled={payoutsEnabled} icon={Wallet} />
    </div>
  )
}

export function StripeConnectMoneyFlow() {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {FLOW_STEPS.map((step) => {
        const Icon = step.icon
        return (
          <div
            key={step.title}
            className="rounded-xl border border-border/80 bg-muted/30 p-4"
          >
            <div
              className={`mb-3 flex h-9 w-9 items-center justify-center rounded-lg ${step.iconClass}`}
            >
              <Icon className="h-4 w-4" aria-hidden />
            </div>
            <p className="text-sm font-semibold text-foreground">{step.title}</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{step.body}</p>
          </div>
        )
      })}
    </div>
  )
}

export function StripeConnectDashboardNote({ ready }: { ready: boolean }) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-dashed border-purple-200/80 bg-gradient-to-r from-purple-600/[0.04] to-blue-600/[0.04] p-4 sm:flex-row sm:items-center sm:justify-between dark:border-purple-800/50">
      <div className="flex items-start gap-3">
        <CircleDollarSign
          className="mt-0.5 h-5 w-5 shrink-0 text-purple-600 dark:text-purple-300"
          aria-hidden
        />
        <div>
          <p className="text-sm font-semibold text-foreground">Full Stripe Dashboard access</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Manage payouts, disputes, tax forms, and bank details directly in Stripe.
          </p>
        </div>
      </div>
      {ready ? (
        <a
          href="https://dashboard.stripe.com"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-purple-700 underline-offset-2 hover:underline dark:text-purple-300"
        >
          Open Stripe Dashboard
          <ExternalLink className="h-3.5 w-3.5" aria-hidden />
        </a>
      ) : null}
    </div>
  )
}

export function StripeConnectAccountDetails({
  accountId,
  accountType,
  email,
}: {
  accountId: string | null
  accountType: string | null
  email: string | null
}) {
  if (!accountId) {
    return null
  }

  return (
    <div className="rounded-xl bg-muted/40 px-4 py-3">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        Connected account
      </p>
      <p className="mt-1 break-all font-mono text-xs text-foreground/80">
        {accountId}
        {accountType ? ` · ${accountType}` : ""}
      </p>
      {email ? (
        <p className="mt-1 text-xs text-muted-foreground">Onboarding email: {email}</p>
      ) : null}
    </div>
  )
}

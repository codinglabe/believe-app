import { Link } from "@inertiajs/react"
import { ArrowLeft, Sparkles } from "lucide-react"
import type { StatusMeta } from "./types"

export function StripeConnectNav() {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <Link
        href={route("integrations.payout-settings")}
        className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
        Payout settings
      </Link>
      <Link
        href={route("dashboard")}
        className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        Dashboard
      </Link>
    </div>
  )
}

export function StripeConnectHeader({
  organizationName,
  statusMeta,
}: {
  organizationName: string
  statusMeta: StatusMeta
}) {
  const StatusIcon = statusMeta.icon

  return (
    <header className="mb-8">
      <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-purple-200/70 bg-white/70 px-3 py-1 text-xs font-semibold tracking-wide text-purple-700 shadow-sm backdrop-blur dark:border-purple-800/60 dark:bg-background/60 dark:text-purple-300">
        <Sparkles className="h-3.5 w-3.5" aria-hidden />
        Stripe Connect · Standard
      </div>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl">
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              Donation payouts
            </span>
          </h1>
          <p className="mt-3 text-base leading-relaxed text-muted-foreground">
            Connect a Standard Stripe account for{" "}
            <span className="font-medium text-foreground">{organizationName}</span>.
            Your nonprofit keeps 100% of each donation and manages payouts from the full Stripe Dashboard.
          </p>
        </div>
        <div
          className={[
            "inline-flex items-center gap-2 self-start rounded-full border px-3.5 py-1.5 text-sm font-semibold shadow-sm",
            statusMeta.tone,
          ].join(" ")}
        >
          <StatusIcon className="h-4 w-4 shrink-0" aria-hidden />
          {statusMeta.label}
        </div>
      </div>
    </header>
  )
}

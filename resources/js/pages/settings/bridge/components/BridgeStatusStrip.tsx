import { Badge } from "@/components/ui/badge"
import { CheckCircle2, AlertCircle, Circle } from "lucide-react"
import { cn } from "@/lib/utils"

export type BridgeEnvIntegrationStatus = {
  api_key_configured: boolean
  webhook_configured: boolean
  webhook_id?: string | null
  stripe_configured: boolean
  issuing_enabled: boolean
  cards_enabled: boolean
  bp_transfer_enabled: boolean
  bp_transfer_ready: boolean
  webhook_detail: string
  stripe_detail: string
  issuing_detail: string
  cards_detail: string
  bp_transfer_detail: string
}

function StatusPill({ label, ok, detail }: { label: string; ok: boolean; detail: string }) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-1 flex-col gap-1 rounded-xl border px-3 py-2.5 sm:px-4",
        ok
          ? "border-emerald-200/80 bg-emerald-50/80 dark:border-emerald-900/50 dark:bg-emerald-950/25"
          : "border-border bg-muted/30",
      )}
    >
      <div className="flex items-center gap-2">
        {ok ? (
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
        ) : (
          <Circle className="h-4 w-4 shrink-0 text-muted-foreground" />
        )}
        <span className="truncate text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
      </div>
      <p
        className={cn(
          "text-sm font-medium leading-snug",
          ok ? "text-emerald-800 dark:text-emerald-200" : "text-foreground",
        )}
      >
        {detail}
      </p>
    </div>
  )
}

export function BridgeStatusStrip({
  viewingEnvironment,
  activeEnvironment,
  status,
}: {
  viewingEnvironment: "sandbox" | "live"
  activeEnvironment: "sandbox" | "live"
  status: BridgeEnvIntegrationStatus
}) {
  const unsavedView = viewingEnvironment !== activeEnvironment

  return (
    <div className="relative overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-purple-600 to-blue-600" />
      <div className="space-y-4 p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-purple-600 dark:text-purple-400">
              Bridge admin
            </p>
            <h2 className="mt-1 text-lg font-semibold tracking-tight text-foreground">
              Integration overview
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Status for{" "}
              <span className="font-medium capitalize">{viewingEnvironment}</span> credentials
              {unsavedView && (
                <>
                  {" "}
                  · active mode is still{" "}
                  <span className="font-medium capitalize">{activeEnvironment}</span> until you save
                </>
              )}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge
              variant="outline"
              className={cn(
                "px-3 py-1 text-xs font-semibold uppercase",
                viewingEnvironment === "live"
                  ? "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200"
                  : "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200",
              )}
            >
              {viewingEnvironment === "live" ? "Live" : "Sandbox"}
            </Badge>
            {!unsavedView && (
              <Badge variant="secondary" className="px-3 py-1 text-xs font-medium">
                Active mode
              </Badge>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          <StatusPill
            label="Webhook"
            ok={status.webhook_configured}
            detail={status.webhook_detail}
          />
          <StatusPill
            label="Stripe"
            ok={status.stripe_configured}
            detail={status.stripe_detail}
          />
          <StatusPill
            label="Issuing"
            ok={status.issuing_enabled}
            detail={status.issuing_detail}
          />
          <StatusPill label="Cards" ok={status.cards_enabled} detail={status.cards_detail} />
          <StatusPill
            label="BP → Wallet"
            ok={status.bp_transfer_ready}
            detail={status.bp_transfer_detail}
          />
        </div>

        {!status.api_key_configured && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-200/80 bg-amber-50/80 px-3 py-2 text-xs text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            Add a Bridge {viewingEnvironment} API key and save to register webhooks.
          </div>
        )}

        {!status.stripe_configured && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-200/80 bg-amber-50/80 px-3 py-2 text-xs text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            Configure Stripe under Settings → Stripe &amp; PayPal before enabling Bridge cards.
          </div>
        )}
      </div>
    </div>
  )
}

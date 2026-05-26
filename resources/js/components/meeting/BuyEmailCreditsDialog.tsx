"use client"

import { useEffect, useMemo, useState } from "react"
import { Loader2, Mail, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { postStripeCheckoutRedirect } from "@/lib/stripe-checkout-post"

export type EmailPackageOption = {
  id: number
  name: string
  description: string | null
  emails_count: number
  price: number
  purchasable: boolean
}

type BuyEmailCreditsDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  emailPackages: EmailPackageOption[]
  stripeMinCheckoutUsd: number
  returnRoute: string
  returnId?: number | null
}

export default function BuyEmailCreditsDialog({
  open,
  onOpenChange,
  emailPackages,
  stripeMinCheckoutUsd,
  returnRoute,
  returnId,
}: BuyEmailCreditsDialogProps) {
  const purchasablePackages = useMemo(
    () => emailPackages.filter((pkg) => pkg.purchasable),
    [emailPackages]
  )

  const [selectedPackageId, setSelectedPackageId] = useState<number | null>(
    purchasablePackages[0]?.id ?? null
  )
  const [purchasing, setPurchasing] = useState(false)
  const [purchaseError, setPurchaseError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) {
      return
    }
    setSelectedPackageId(purchasablePackages[0]?.id ?? null)
    setPurchaseError(null)
  }, [open, purchasablePackages])

  const purchase = async () => {
    if (!selectedPackageId) {
      return
    }

    setPurchasing(true)
    setPurchaseError(null)

    const result = await postStripeCheckoutRedirect(route("email-credits.purchase"), {
      package_id: selectedPackageId,
      return_route: returnRoute,
      return_id: returnId ?? undefined,
    })

    if (!result.ok) {
      setPurchaseError(result.message)
      setPurchasing(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-border bg-card text-foreground sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-purple-600 to-blue-600 text-white">
              <Mail className="h-4 w-4" />
            </span>
            Buy email credits
          </DialogTitle>
          <DialogDescription>
            Pay with card via Stripe. You&apos;ll return to this meeting after checkout. Each invitation uses one credit.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[min(50vh,20rem)] space-y-2 overflow-y-auto py-1">
          {emailPackages.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No email packages are available right now.
            </p>
          ) : purchasablePackages.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No packs meet Stripe&apos;s ${stripeMinCheckoutUsd.toFixed(2)} minimum. Contact support.
            </p>
          ) : (
            emailPackages.map((pkg) => (
              <button
                key={pkg.id}
                type="button"
                disabled={!pkg.purchasable}
                onClick={() => {
                  if (pkg.purchasable) {
                    setSelectedPackageId(pkg.id)
                  }
                }}
                className={cn(
                  "w-full rounded-xl border-2 p-4 text-left transition-all",
                  !pkg.purchasable && "cursor-not-allowed opacity-55",
                  selectedPackageId === pkg.id && pkg.purchasable
                    ? "border-purple-500 bg-purple-500/5 dark:border-purple-400"
                    : "border-border hover:border-purple-300 dark:hover:border-purple-500/50"
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground">
                      +{pkg.emails_count.toLocaleString()} email{pkg.emails_count === 1 ? "" : "s"}
                    </p>
                    <p className="text-sm text-muted-foreground">{pkg.name}</p>
                    {!pkg.purchasable ? (
                      <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
                        Below ${stripeMinCheckoutUsd.toFixed(2)} card minimum
                      </p>
                    ) : null}
                    {pkg.description ? (
                      <p className="mt-1 text-xs text-muted-foreground">{pkg.description}</p>
                    ) : null}
                  </div>
                  <p className="shrink-0 text-lg font-bold tabular-nums text-foreground">
                    ${pkg.price.toFixed(2)}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>

        {purchaseError ? (
          <p className="text-sm text-destructive">{purchaseError}</p>
        ) : null}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={purchasing}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700"
            disabled={!selectedPackageId || purchasing || purchasablePackages.length === 0}
            onClick={purchase}
          >
            {purchasing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Opening checkout…
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Pay with card
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

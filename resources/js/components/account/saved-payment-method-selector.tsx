"use client"

import { cn } from "@/lib/utils"
import { CreditCard, Landmark, Star } from "lucide-react"

export type SavedPaymentMethod = {
  id: string
  type: string
  brand: string | null
  last4: string | null
  exp_month: number | null
  exp_year: number | null
  bank_name: string | null
  is_default: boolean
}

type SavedPaymentMethodSelectorProps = {
  methods: SavedPaymentMethod[]
  rail: "card" | "bank"
  value: string | null
  onChange: (paymentMethodId: string | null) => void
  manageHref: string
  /** When false, user must pick a saved method (e.g. auto top-up). */
  showNewOption?: boolean
  className?: string
}

function labelForMethod(method: SavedPaymentMethod): string {
  if (method.type === "us_bank_account") {
    const bank = method.bank_name ?? "Bank account"
    return `${bank} •••• ${method.last4 ?? "????"}`
  }

  const brand = method.brand ? method.brand.charAt(0).toUpperCase() + method.brand.slice(1) : "Card"
  const exp =
    method.exp_month && method.exp_year
      ? ` · ${String(method.exp_month).padStart(2, "0")}/${String(method.exp_year).slice(-2)}`
      : ""

  return `${brand} •••• ${method.last4 ?? "????"}${exp}`
}

export function filterMethodsForRail(
  methods: SavedPaymentMethod[],
  rail: "card" | "bank",
): SavedPaymentMethod[] {
  return methods.filter((method) =>
    rail === "bank" ? method.type === "us_bank_account" : method.type === "card",
  )
}

export function SavedPaymentMethodSelector({
  methods,
  rail,
  value,
  onChange,
  manageHref,
  showNewOption = true,
  className,
}: SavedPaymentMethodSelectorProps) {
  const filtered = filterMethodsForRail(methods, rail)

  if (filtered.length === 0) {
    return (
      <p className={cn("text-sm text-muted-foreground", className)}>
        No saved {rail === "bank" ? "bank accounts" : "cards"} yet.{" "}
        <a href={manageHref} className="text-primary underline-offset-2 hover:underline">
          Add one in Payment Methods
        </a>
        .
      </p>
    )
  }

  return (
    <div className={cn("space-y-2", className)}>
      {showNewOption && (
        <button
          type="button"
          onClick={() => onChange(null)}
          className={cn(
            "flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors",
            value === null
              ? "border-purple-500 bg-purple-50 dark:border-purple-400 dark:bg-purple-950/30"
              : "border-border hover:bg-muted/50",
          )}
        >
          <CreditCard className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span>Use a new {rail === "bank" ? "bank account" : "card"} at checkout</span>
        </button>
      )}

      {filtered.map((method) => {
        const Icon = method.type === "us_bank_account" ? Landmark : CreditCard
        const selected = value === method.id

        return (
          <button
            key={method.id}
            type="button"
            onClick={() => onChange(method.id)}
            className={cn(
              "flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors",
              selected
                ? "border-purple-500 bg-purple-50 dark:border-purple-400 dark:bg-purple-950/30"
                : "border-border hover:bg-muted/50",
            )}
          >
            <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="min-w-0 flex-1 truncate">{labelForMethod(method)}</span>
            {method.is_default && (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Star className="h-3 w-3 fill-current" />
                Default
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

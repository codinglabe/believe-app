"use client"

import { cn } from "@/lib/utils"
import { CreditCard, Landmark, Star } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

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
  /** Compact: dropdown (or chip row when ≤2 methods) — better for tight layouts. */
  variant?: "default" | "compact"
}

const NEW_METHOD_VALUE = "__new_checkout__"

export function labelForMethod(method: SavedPaymentMethod): string {
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

function EmptySavedMethods({
  rail,
  manageHref,
  className,
}: {
  rail: "card" | "bank"
  manageHref: string
  className?: string
}) {
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

function CompactMethodChip({
  label,
  icon: Icon,
  selected,
  onClick,
  isDefault,
}: {
  label: string
  icon: typeof CreditCard
  selected: boolean
  onClick: () => void
  isDefault?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex max-w-full items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-left text-xs transition-colors",
        selected
          ? "border-purple-500 bg-purple-50 text-purple-900 dark:border-purple-400 dark:bg-purple-950/40 dark:text-white"
          : "border-border bg-background hover:bg-muted/50 dark:border-white/15 dark:bg-white/5",
      )}
    >
      <Icon className="h-3.5 w-3.5 shrink-0 opacity-70" />
      <span className="truncate">{label}</span>
      {isDefault && <Star className="h-3 w-3 shrink-0 fill-current text-amber-500" />}
    </button>
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
  variant = "default",
}: SavedPaymentMethodSelectorProps) {
  const filtered = filterMethodsForRail(methods, rail)
  const newLabel = `New ${rail === "bank" ? "bank account" : "card"} at checkout`

  if (filtered.length === 0) {
    return <EmptySavedMethods rail={rail} manageHref={manageHref} className={className} />
  }

  if (variant === "compact") {
    const useDropdown = filtered.length > 2 || !showNewOption

    if (useDropdown) {
      const selectValue = value ?? (showNewOption ? NEW_METHOD_VALUE : filtered[0]?.id ?? "")

      return (
        <div className={cn("space-y-1.5", className)}>
          <Select
            value={selectValue}
            onValueChange={(next) => onChange(next === NEW_METHOD_VALUE ? null : next)}
          >
            <SelectTrigger className="h-9 w-full bg-white text-sm dark:bg-white/5">
              <SelectValue placeholder={`Choose saved ${rail === "bank" ? "bank" : "card"}`} />
            </SelectTrigger>
            <SelectContent className="max-h-56">
              {showNewOption && (
                <SelectItem value={NEW_METHOD_VALUE}>{newLabel}</SelectItem>
              )}
              {filtered.map((method) => (
                <SelectItem key={method.id} value={method.id}>
                  {labelForMethod(method)}
                  {method.is_default ? " · Default" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-[10px] text-muted-foreground">
            <a href={manageHref} className="underline-offset-2 hover:underline">
              Manage payment methods
            </a>
          </p>
        </div>
      )
    }

    return (
      <div className={cn("space-y-2", className)}>
        <div className="flex flex-wrap gap-1.5">
          {showNewOption && (
            <CompactMethodChip
              label={rail === "bank" ? "New bank" : "New card"}
              icon={rail === "bank" ? Landmark : CreditCard}
              selected={value === null}
              onClick={() => onChange(null)}
            />
          )}
          {filtered.map((method) => {
            const Icon = method.type === "us_bank_account" ? Landmark : CreditCard
            return (
              <CompactMethodChip
                key={method.id}
                label={labelForMethod(method)}
                icon={Icon}
                selected={value === method.id}
                isDefault={method.is_default}
                onClick={() => onChange(method.id)}
              />
            )
          })}
        </div>
      </div>
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

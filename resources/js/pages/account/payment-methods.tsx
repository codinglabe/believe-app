"use client"

import { Head, router, usePage } from "@inertiajs/react"
import ProfileLayout from "@/components/frontend/layout/user-profile-layout"
import SettingsLayout from "@/layouts/settings/layout"
import { Button } from "@/components/frontend/ui/button"
import { Badge } from "@/components/frontend/ui/badge"
import {
  AlertCircle,
  CheckCircle2,
  CreditCard,
  Landmark,
  Lock,
  Plus,
  Star,
  Trash2,
} from "lucide-react"
import { showErrorToast, showSuccessToast } from "@/lib/toast"
import { useEffect, useMemo, useRef, useState } from "react"
import type { SavedPaymentMethod } from "@/components/account/saved-payment-method-selector"
import { cn } from "@/lib/utils"
import { ConfirmationModal } from "@/components/confirmation-modal"

type PageProps = {
  layout: "profile" | "settings"
  paymentMethods: SavedPaymentMethod[]
  returnUrl?: string | null
  flash?: {
    success?: string
    error?: string
  }
}

function formatBrand(brand: string | null): string {
  if (!brand) return "Card"
  return brand.charAt(0).toUpperCase() + brand.slice(1)
}

function methodLabel(method: SavedPaymentMethod): string {
  if (method.type === "us_bank_account") {
    return `${method.bank_name ?? "Bank"} •••• ${method.last4 ?? "????"}`
  }
  const exp =
    method.exp_month && method.exp_year
      ? ` · ${String(method.exp_month).padStart(2, "0")}/${String(method.exp_year).slice(-2)}`
      : ""
  return `${formatBrand(method.brand)} •••• ${method.last4 ?? "????"}${exp}`
}

function PaymentMethodRow({
  method,
  onSetDefault,
  onRemove,
}: {
  method: SavedPaymentMethod
  onSetDefault: () => void
  onRemove: () => void
}) {
  const isBank = method.type === "us_bank_account"

  return (
    <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2.5 dark:border-gray-700 dark:bg-gray-900">
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-md",
          isBank
            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
            : "bg-gradient-to-br from-purple-500 to-blue-600 text-white",
        )}
      >
        {isBank ? <Landmark className="h-3.5 w-3.5" /> : <CreditCard className="h-3.5 w-3.5" />}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium text-gray-900 dark:text-white">{methodLabel(method)}</p>
          {method.is_default && (
            <Badge variant="secondary" className="h-5 shrink-0 gap-0.5 px-1.5 text-[10px]">
              <Star className="h-2.5 w-2.5 fill-current" />
              Default
            </Badge>
          )}
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400">{isBank ? "ACH" : "Card"}</p>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        {!method.is_default && (
          <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={onSetDefault}>
            Default
          </Button>
        )}
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-7 w-7 p-0 text-destructive hover:text-destructive"
          onClick={onRemove}
          aria-label="Remove"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  )
}

function PaymentMethodsContent({
  paymentMethods,
  returnUrl,
  flash,
}: {
  paymentMethods: SavedPaymentMethod[]
  returnUrl?: string | null
  flash?: PageProps["flash"]
}) {
  useEffect(() => {
    if (flash?.success) showSuccessToast(flash.success)
    if (flash?.error) showErrorToast(flash.error)
  }, [flash?.success, flash?.error])

  const [removeTarget, setRemoveTarget] = useState<SavedPaymentMethod | null>(null)
  const [isRemoving, setIsRemoving] = useState(false)
  const removingRef = useRef(false)

  const defaultMethod = useMemo(
    () => paymentMethods.find((m) => m.is_default) ?? null,
    [paymentMethods],
  )

  const addInstrument = (instrument: "card" | "bank") => {
    router.post(
      route("account.payment-methods.setup"),
      {
        instrument,
        return: returnUrl ?? undefined,
      },
      { preserveScroll: true },
    )
  }

  const setDefault = (paymentMethodId: string) => {
    router.post(route("account.payment-methods.default", paymentMethodId), {}, { preserveScroll: true })
  }

  const confirmRemove = () => {
    if (!removeTarget) return
    removingRef.current = true
    setIsRemoving(true)
    router.delete(route("account.payment-methods.destroy", removeTarget.id), {
      preserveScroll: true,
      onFinish: () => {
        removingRef.current = false
        setIsRemoving(false)
        setRemoveTarget(null)
      },
    })
  }

  return (
    <div className="w-full space-y-3">
      {flash?.success && (
        <div className="flex items-center gap-2 rounded-md border border-green-200 bg-green-50 px-3 py-2 dark:border-green-800 dark:bg-green-950/30">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" />
          <p className="text-xs text-green-900 dark:text-green-100">{flash.success}</p>
        </div>
      )}
      {flash?.error && (
        <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 dark:border-red-800 dark:bg-red-950/30">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
          <p className="text-xs text-red-900 dark:text-red-100">{flash.error}</p>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" size="sm" className="h-8 gap-1.5" onClick={() => addInstrument("card")}>
          <Plus className="h-3.5 w-3.5" />
          Add card
        </Button>
        <Button type="button" size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => addInstrument("bank")}>
          <Plus className="h-3.5 w-3.5" />
          Add bank
        </Button>
        <span className="ml-auto flex items-center gap-1 text-[11px] text-gray-500 dark:text-gray-400">
          <Lock className="h-3 w-3" />
          Secured by Stripe
        </span>
      </div>

      {defaultMethod && (
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Default: {methodLabel(defaultMethod)}
        </p>
      )}

      {paymentMethods.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 px-4 py-6 text-center dark:border-gray-600">
          <CreditCard className="mx-auto h-6 w-6 text-gray-400" />
          <p className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No saved methods</p>
          <p className="mt-0.5 text-xs text-gray-500">Add a card or bank to pay faster at checkout.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {paymentMethods.map((method) => (
            <PaymentMethodRow
              key={method.id}
              method={method}
              onSetDefault={() => setDefault(method.id)}
              onRemove={() => setRemoveTarget(method)}
            />
          ))}
        </div>
      )}

      <ConfirmationModal
        isOpen={removeTarget !== null}
        onChange={(open) => {
          if (!open && !removingRef.current) setRemoveTarget(null)
        }}
        title="Remove payment method?"
        description={
          removeTarget
            ? `${methodLabel(removeTarget)} will be removed from your account. You can add it again anytime through Stripe.`
            : "This payment method will be removed from your account."
        }
        confirmLabel="Remove"
        cancelLabel="Keep"
        onConfirm={confirmRemove}
        onCancel={() => setRemoveTarget(null)}
        isLoading={isRemoving}
      />
    </div>
  )
}

export default function PaymentMethodsPage() {
  const { layout, paymentMethods, returnUrl, flash } = usePage<PageProps>().props

  const content = (
    <PaymentMethodsContent paymentMethods={paymentMethods} returnUrl={returnUrl} flash={flash} />
  )

  if (layout === "settings") {
    return (
      <SettingsLayout
        activeTab="saved-payment-methods"
        pageTitle="Payment Methods"
        pageSubtitle="Cards and bank accounts for Stripe checkout"
      >
        <Head title="Payment Methods" />
        {content}
      </SettingsLayout>
    )
  }

  return (
    <ProfileLayout title="Payment Methods" description="Saved cards and bank accounts">
      <Head title="Payment Methods" />
      {content}
    </ProfileLayout>
  )
}

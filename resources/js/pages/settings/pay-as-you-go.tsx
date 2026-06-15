"use client"

import { useEffect, useState } from "react"
import { Head, Link, router, usePage } from "@inertiajs/react"
import SettingsLayout from "@/layouts/settings/layout"
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
import {
  Bot,
  Clock,
  Cpu,
  Info,
  Loader2,
  Mail,
  MessageSquare,
  Wallet,
} from "lucide-react"

type EmailPackage = {
  id: number
  name: string
  description: string | null
  emails_count: number
  price: number
  purchasable: boolean
}

type SmsPackage = {
  id: number
  name: string
  description: string | null
  sms_count: number
  price: number
}

type AiPackage = {
  key: string
  tokens: number
  price: number
  label: string
}

type ServiceBlock = {
  balance: number
  included: number
  used: number
  rate_label: string
  min_reup_label: string | null
}

type Props = {
  services: {
    email: ServiceBlock & { packages: EmailPackage[] }
    sms: ServiceBlock & { packages: SmsPackage[] }
    ai: ServiceBlock & { packages: AiPackage[] }
    sms_auto_recharge_enabled: boolean
  }
  stripeMinCheckoutUsd: number
}

type ReUpKind = "email" | "sms" | "ai" | null

export default function PayAsYouGoServicesPage({ services, stripeMinCheckoutUsd }: Props) {
  const { success, error } = usePage<{ success?: string; error?: string }>().props
  const [reUpKind, setReUpKind] = useState<ReUpKind>(null)
  const [selectedEmailId, setSelectedEmailId] = useState<number | null>(
    services.email.packages.find((p) => p.purchasable)?.id ?? null
  )
  const [selectedSmsId, setSelectedSmsId] = useState<number | null>(services.sms.packages[0]?.id ?? null)
  const [selectedAiKey, setSelectedAiKey] = useState<string | null>(services.ai.packages[0]?.key ?? null)
  const [purchasing, setPurchasing] = useState(false)
  const [purchaseError, setPurchaseError] = useState<string | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const open = params.get("open")
    if (open === "email" || open === "sms" || open === "ai") {
      setReUpKind(open)
    }
  }, [])

  const queryError =
    typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("error") : null
  const displayError = error ?? queryError

  const closeDialog = () => {
    setReUpKind(null)
    setPurchaseError(null)
    setPurchasing(false)
  }

  const purchaseEmail = async () => {
    if (!selectedEmailId) return
    setPurchasing(true)
    setPurchaseError(null)
    const result = await postStripeCheckoutRedirect(route("email-credits.purchase"), {
      package_id: selectedEmailId,
      return_route: "pay-as-you-go.index",
    })
    if (!result.ok) {
      setPurchaseError(result.message)
      setPurchasing(false)
    }
  }

  const purchaseSms = () => {
    if (!selectedSmsId) return
    setPurchasing(true)
    setPurchaseError(null)
    router.post(
      route("newsletter.purchase-sms"),
      { package_id: selectedSmsId, return_to: "pay-as-you-go" },
      {
        onError: () => {
          setPurchaseError("Could not start checkout. Try again.")
          setPurchasing(false)
        },
      }
    )
  }

  const purchaseAi = () => {
    if (!selectedAiKey) return
    setPurchasing(true)
    setPurchaseError(null)
    router.post(
      route("credits.checkout"),
      { package: selectedAiKey, return_route: "pay-as-you-go.index" },
      {
        onError: () => {
          setPurchaseError("Could not start checkout. Try again.")
          setPurchasing(false)
        },
      }
    )
  }

  const handlePurchase = () => {
    if (reUpKind === "email") return purchaseEmail()
    if (reUpKind === "sms") return purchaseSms()
    if (reUpKind === "ai") return purchaseAi()
  }

  const serviceRows = [
    {
      id: "email" as const,
      title: "Email Re-Ups",
      description: "Purchase additional emails to reach more of your supporters.",
      icon: Mail,
      iconClass: "bg-blue-100 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400",
      balanceClass: "text-blue-600 dark:text-blue-400",
      balanceLabel: `${services.email.balance.toLocaleString()} emails`,
      rate: services.email.rate_label,
      minReup: services.email.min_reup_label,
    },
    {
      id: "ai" as const,
      title: "AI Packs",
      description: "Add AI tokens to access more powerful prompts and features.",
      icon: Cpu,
      iconClass: "bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400",
      balanceClass: "text-emerald-600 dark:text-emerald-400",
      balanceLabel: `${services.ai.balance.toLocaleString()} tokens`,
      rate: services.ai.rate_label,
      minReup: services.ai.min_reup_label,
    },
    {
      id: "sms" as const,
      title: "SMS Messaging",
      description: "Send text messages to your supporters instantly.",
      icon: MessageSquare,
      iconClass: "bg-orange-100 text-orange-600 dark:bg-orange-950/60 dark:text-orange-400",
      balanceClass: "text-orange-600 dark:text-orange-400",
      balanceLabel: `${services.sms.balance.toLocaleString()} texts`,
      rate: services.sms.rate_label,
      minReup: services.sms.min_reup_label,
    },
  ]

  const dialogPackages =
    reUpKind === "email"
      ? services.email.packages.filter((p) => p.purchasable)
      : reUpKind === "sms"
        ? services.sms.packages
        : reUpKind === "ai"
          ? services.ai.packages
          : []

  const selectedPackageLabel = () => {
    if (reUpKind === "email") {
      const pkg = services.email.packages.find((p) => p.id === selectedEmailId)
      return pkg ? `${pkg.name} — $${pkg.price.toFixed(2)}` : null
    }
    if (reUpKind === "sms") {
      const pkg = services.sms.packages.find((p) => p.id === selectedSmsId)
      return pkg ? `${pkg.name} — $${pkg.price.toFixed(2)}` : null
    }
    if (reUpKind === "ai") {
      const pkg = services.ai.packages.find((p) => p.key === selectedAiKey)
      return pkg ? `${pkg.label} — $${pkg.price.toFixed(2)}` : null
    }
    return null
  }

  return (
    <SettingsLayout
      activeTab="pay-as-you-go"
      pageTitle="Pay-As-You-Go Services"
      pageSubtitle="Add resources to your account as you need them. You only pay for what you use — no monthly fees, no commitments."
    >
      <Head title="Pay-As-You-Go Services" />

      <div className="space-y-6">
        {success ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100">
            {success}
          </div>
        ) : null}
        {displayError ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-900 dark:bg-red-950/40 dark:text-red-100">
            {displayError}
          </div>
        ) : null}

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-purple-100 text-purple-600 dark:bg-purple-950/50 dark:text-purple-400">
              <Wallet className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Usage-based add-ons</h2>
              <p className="mt-1 max-w-2xl text-sm text-gray-600 dark:text-gray-400">
                Email, SMS, and AI tokens live in one place. Re-up any service when your balance runs low.
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-purple-200/80 bg-purple-50/80 px-4 py-3 dark:border-purple-800/60 dark:bg-purple-950/30 sm:min-w-[220px]">
            <p className="text-xs font-medium uppercase tracking-wide text-purple-600 dark:text-purple-400">
              Auto-recharge
            </p>
            <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">
              SMS: {services.sms_auto_recharge_enabled ? "On" : "Off"}
            </p>
            <Link
              href={route("newsletter.index")}
              className="mt-1 inline-block text-sm font-medium text-purple-700 hover:underline dark:text-purple-300"
            >
              Manage
            </Link>
          </div>
        </div>

        <div className="space-y-4">
          {serviceRows.map((row) => {
            const Icon = row.icon
            return (
              <div
                key={row.id}
                className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-950 sm:p-5"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex min-w-0 flex-1 items-start gap-4">
                    <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl", row.iconClass)}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-base font-semibold text-gray-900 dark:text-white">{row.title}</h3>
                      <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{row.description}</p>
                      <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm">
                        <span className="text-gray-500 dark:text-gray-400">
                          <span className="font-medium text-gray-700 dark:text-gray-300">Price:</span> {row.rate}
                        </span>
                        {row.minReup ? (
                          <span className="text-gray-500 dark:text-gray-400">
                            <span className="font-medium text-gray-700 dark:text-gray-300">Min re-up:</span>{" "}
                            {row.minReup}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center lg:flex-col lg:items-end">
                    <Button
                      type="button"
                      className="bg-gray-900 text-white hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100"
                      onClick={() => setReUpKind(row.id)}
                    >
                      Re-Up Now
                    </Button>
                    <div className={cn("flex items-center gap-2 text-sm", row.balanceClass)}>
                      <Clock className="h-4 w-4 shrink-0 opacity-70" />
                      <span>
                        Current balance: <span className="font-semibold">{row.balanceLabel}</span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <div className="flex flex-col gap-3 rounded-xl border border-blue-200/80 bg-blue-50/70 px-4 py-3 text-sm text-blue-900 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-100 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-2">
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
            <p>These services are usage-based and optional. You will only be charged when you re-up your balance.</p>
          </div>
          <Link
            href={route("billing.index")}
            className="shrink-0 font-medium text-blue-700 hover:underline dark:text-blue-300"
          >
            View usage history
          </Link>
        </div>

        <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50/80 px-4 py-3 text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-900/40 dark:text-gray-400">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <Link href={route("setup-checklist.index")} className="font-medium text-purple-700 hover:underline dark:text-purple-300">
              View setup checklist
            </Link>
            <span className="hidden sm:inline text-gray-300 dark:text-gray-600">|</span>
            <span className="flex items-center gap-2">
              <Bot className="h-4 w-4" />
              AI Video Studio credits are separate.{" "}
              <Link href={route("credits.purchase")} className="font-medium text-purple-700 hover:underline dark:text-purple-300">
                Top up video studio credits
              </Link>
            </span>
          </div>
        </div>
      </div>

      <Dialog open={reUpKind !== null} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {reUpKind === "email" ? "Email Re-Up" : reUpKind === "sms" ? "SMS Re-Up" : "AI Pack Re-Up"}
            </DialogTitle>
            <DialogDescription>
              Choose a pack. Checkout opens in Stripe, then returns you here.
              {stripeMinCheckoutUsd > 0 ? ` Minimum charge: $${stripeMinCheckoutUsd.toFixed(2)}.` : null}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-2 py-2">
            {reUpKind === "email" &&
              (dialogPackages as EmailPackage[]).map((pkg) => (
                <button
                  key={pkg.id}
                  type="button"
                  onClick={() => setSelectedEmailId(pkg.id)}
                  className={cn(
                    "rounded-lg border px-4 py-3 text-left transition-colors",
                    selectedEmailId === pkg.id
                      ? "border-purple-500 bg-purple-50 dark:border-purple-500 dark:bg-purple-950/40"
                      : "border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600"
                  )}
                >
                  <p className="font-medium">{pkg.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {pkg.emails_count.toLocaleString()} emails · ${pkg.price.toFixed(2)}
                  </p>
                </button>
              ))}

            {reUpKind === "sms" &&
              (dialogPackages as SmsPackage[]).map((pkg) => (
                <button
                  key={pkg.id}
                  type="button"
                  onClick={() => setSelectedSmsId(pkg.id)}
                  className={cn(
                    "rounded-lg border px-4 py-3 text-left transition-colors",
                    selectedSmsId === pkg.id
                      ? "border-purple-500 bg-purple-50 dark:border-purple-500 dark:bg-purple-950/40"
                      : "border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600"
                  )}
                >
                  <p className="font-medium">{pkg.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {pkg.sms_count.toLocaleString()} texts · ${pkg.price.toFixed(2)}
                  </p>
                </button>
              ))}

            {reUpKind === "ai" &&
              (dialogPackages as AiPackage[]).map((pkg) => (
                <button
                  key={pkg.key}
                  type="button"
                  onClick={() => setSelectedAiKey(pkg.key)}
                  className={cn(
                    "rounded-lg border px-4 py-3 text-left transition-colors",
                    selectedAiKey === pkg.key
                      ? "border-purple-500 bg-purple-50 dark:border-purple-500 dark:bg-purple-950/40"
                      : "border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600"
                  )}
                >
                  <p className="font-medium">{pkg.label}</p>
                  <p className="text-sm text-muted-foreground">${pkg.price.toFixed(2)}</p>
                </button>
              ))}

            {dialogPackages.length === 0 ? (
              <p className="text-sm text-muted-foreground">No packs available. Contact support.</p>
            ) : null}
          </div>

          {purchaseError ? <p className="text-sm text-destructive">{purchaseError}</p> : null}
          {selectedPackageLabel() ? (
            <p className="text-sm text-muted-foreground">Selected: {selectedPackageLabel()}</p>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={closeDialog} disabled={purchasing}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handlePurchase}
              disabled={
                purchasing ||
                dialogPackages.length === 0 ||
                (reUpKind === "email" && !selectedEmailId) ||
                (reUpKind === "sms" && !selectedSmsId) ||
                (reUpKind === "ai" && !selectedAiKey)
              }
            >
              {purchasing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Redirecting…
                </>
              ) : (
                "Continue to checkout"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SettingsLayout>
  )
}

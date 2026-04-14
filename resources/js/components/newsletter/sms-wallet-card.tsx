"use client"

import { Link, router } from "@inertiajs/react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Switch } from "@/components/frontend/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Loader2, Mail, Smartphone, Send, Plus, ArrowLeft, Globe, CreditCard } from "lucide-react"
import { useEffect, useId, useState } from "react"
import { showErrorToast, showSuccessToast } from "@/lib/toast"
import { cn } from "@/lib/utils"
import {
    BRAND_GRADIENT,
    brandButtonClass,
    brandButtonClassSm,
    brandOutlineAccentClass,
    brandPackageHoverClass,
    brandPackageSelectedClass,
} from "@/lib/brand-styles"

export interface EmailUsageStats {
    emails_included: number
    emails_used: number
    emails_left: number
}

export interface EmailUsagePackage {
    id: number
    name: string
    description: string | null
    emails_count: number
    price: number
}

export interface SmsStats {
    sms_included: number
    sms_used: number
    sms_left: number
}

export interface SmsPackage {
    id: number
    name: string
    description: string | null
    sms_count: number
    price: number
}

/** Mirrors `newsletterSmsWalletProps` → `smsAutoRecharge` (Laravel Cashier off-session). */
export interface SmsAutoRechargeDetails {
    threshold: number | null
    package_id: number | null
    has_payment_method: boolean
    card_brand: string | null
    card_last4: string | null
    last_recharge_at: string | null
}

interface NewsletterSmsWalletCardProps {
    emailStats?: EmailUsageStats
    emailPackages?: EmailUsagePackage[]
    smsStats?: SmsStats
    smsPackages?: SmsPackage[]
    smsAutoRechargeEnabled?: boolean
    smsAutoRecharge?: SmsAutoRechargeDetails | null
    /** From newsletter index URL — drives Usage / Drafts / Sent tab highlight */
    statusFilter?: string
    showCreateButton?: boolean
    showFooterNav?: boolean
    /** When set with the matching `on*Change`, Buy email dialog is controlled by the parent (e.g. toolbar quick-buy). */
    buyEmailDialogOpen?: boolean
    onBuyEmailDialogOpenChange?: (open: boolean) => void
    /** When set with the matching `on*Change`, Buy SMS dialog is controlled by the parent. */
    buySmsDialogOpen?: boolean
    onBuySmsDialogOpenChange?: (open: boolean) => void
    /** Render only purchase dialogs (no card UI) — e.g. Newsletter Dashboard toolbar. */
    variant?: "full" | "dialogsOnly"
    /** When true, Stripe success/cancel return to the Newsletter dashboard instead of create / Email Invite. */
    checkoutReturnToNewsletter?: boolean
}

export function NewsletterSmsWalletCard({
    emailStats,
    emailPackages = [],
    smsStats,
    smsPackages = [],
    smsAutoRechargeEnabled = false,
    smsAutoRecharge = null,
    statusFilter = "all",
    showCreateButton = true,
    showFooterNav = true,
    buyEmailDialogOpen: buyEmailDialogOpenProp,
    onBuyEmailDialogOpenChange,
    buySmsDialogOpen: buySmsDialogOpenProp,
    onBuySmsDialogOpenChange,
    variant = "full",
    checkoutReturnToNewsletter = false,
}: NewsletterSmsWalletCardProps) {
    const [buySmsInternal, setBuySmsInternal] = useState(false)
    const [buyEmailInternal, setBuyEmailInternal] = useState(false)
    const smsDialogControlled = onBuySmsDialogOpenChange != null
    const emailDialogControlled = onBuyEmailDialogOpenChange != null
    const buySmsOpen = smsDialogControlled ? Boolean(buySmsDialogOpenProp) : buySmsInternal
    const buyEmailOpen = emailDialogControlled ? Boolean(buyEmailDialogOpenProp) : buyEmailInternal
    const setBuySmsOpen = (open: boolean) => {
        if (smsDialogControlled) {
            onBuySmsDialogOpenChange?.(open)
        } else {
            setBuySmsInternal(open)
        }
    }
    const setBuyEmailOpen = (open: boolean) => {
        if (emailDialogControlled) {
            onBuyEmailDialogOpenChange?.(open)
        } else {
            setBuyEmailInternal(open)
        }
    }
    const [selectedSmsId, setSelectedSmsId] = useState<number | null>(null)
    const [selectedEmailPkgId, setSelectedEmailPkgId] = useState<number | null>(null)
    const [purchasingSms, setPurchasingSms] = useState(false)
    const [purchasingEmail, setPurchasingEmail] = useState(false)
    const [autoRecharge, setAutoRecharge] = useState(smsAutoRechargeEnabled)
    const [thresholdInput, setThresholdInput] = useState(() =>
        String(smsAutoRecharge?.threshold ?? 50)
    )
    const [packageId, setPackageId] = useState<number | null>(
        () => smsAutoRecharge?.package_id ?? smsPackages[0]?.id ?? null
    )
    const [policyAccepted, setPolicyAccepted] = useState(false)
    const [prefsSaving, setPrefsSaving] = useState(false)
    const arFieldId = useId()

    useEffect(() => {
        setAutoRecharge(smsAutoRechargeEnabled)
        if (smsAutoRechargeEnabled) {
            setPolicyAccepted(true)
        }
    }, [smsAutoRechargeEnabled])

    useEffect(() => {
        if (smsAutoRecharge?.threshold != null) {
            setThresholdInput(String(smsAutoRecharge.threshold))
        }
        if (smsAutoRecharge?.package_id != null) {
            setPackageId(smsAutoRecharge.package_id)
        }
    }, [smsAutoRecharge])

    const resolveAutoRechargePackageId = (): number | null =>
        packageId ?? selectedSmsId ?? smsPackages[0]?.id ?? null

    const postSmsWalletPrefs = (nextEnabled: boolean) => {
        const thresholdNum = Number.parseInt(thresholdInput.replace(/\D/g, ""), 10)
        const safeThreshold = Number.isFinite(thresholdNum) ? thresholdNum : 50
        const pid = resolveAutoRechargePackageId()
        setPrefsSaving(true)
        const body: Record<string, string | number | boolean | null> = {
            sms_auto_recharge_enabled: nextEnabled,
            sms_auto_recharge_threshold: safeThreshold,
            sms_auto_recharge_package_id: pid,
        }
        if (nextEnabled) {
            body.sms_auto_recharge_policy_accepted = policyAccepted
        }
        router.post(
            route("newsletter.sms-wallet-preferences"),
            body,
            {
                preserveScroll: true,
                onFinish: () => setPrefsSaving(false),
                onSuccess: () => {
                    setAutoRecharge(nextEnabled)
                    showSuccessToast("SMS wallet preferences saved")
                },
                onError: () => {
                    showErrorToast("Could not save preferences")
                    setAutoRecharge(!nextEnabled)
                },
            }
        )
    }

    const saveAutoRecharge = (next: boolean) => {
        if (next) {
            if (!smsAutoRecharge?.has_payment_method) {
                showErrorToast("Add a saved card first (Stripe checkout).")
                return
            }
            const pickedPackageId = packageId ?? selectedSmsId ?? null
            if (!pickedPackageId) {
                showErrorToast(smsPackages.length > 0 ? "Select a package above first." : "No SMS packages available. Contact support.")
                return
            }
            if (!policyAccepted) {
                showErrorToast("Confirm you authorize automatic charges.")
                return
            }
        }
        setAutoRecharge(next)
        postSmsWalletPrefs(next)
    }

    const renderSmsAutoRechargeControls = (embed: "default" | "inBuyDialog" = "default") => (
        <div
            className={cn(
                "space-y-3 p-3",
                embed === "inBuyDialog"
                    ? "rounded-lg border border-white/10 bg-zinc-900/50"
                    : "rounded-lg border border-dashed border-purple-500/35 bg-black/20"
            )}
        >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-0.5">
                    <Label htmlFor={`${arFieldId}-ar-switch`} className="text-sm font-medium text-zinc-200">
                        Auto-recharge (Laravel Cashier)
                    </Label>
                    <p className="text-xs text-zinc-500">
                        {embed === "inBuyDialog"
                            ? "When credits fall at or below your threshold, we charge your saved card (at most once per hour) and add the package you selected above."
                            : "When remaining credits fall at or below your threshold, we charge your saved card once per hour at most and add the selected SMS package to your wallet."}
                    </p>
                </div>
                <Switch
                    id={`${arFieldId}-ar-switch`}
                    checked={autoRecharge}
                    disabled={prefsSaving}
                    onCheckedChange={saveAutoRecharge}
                />
            </div>

            <div className={cn("grid gap-3", embed === "inBuyDialog" ? "grid-cols-1" : "sm:grid-cols-2")}>
                <div className="space-y-1.5">
                    <Label htmlFor={`${arFieldId}-ar-threshold`} className="text-xs text-zinc-500">
                        Recharge when credits at or below
                    </Label>
                    <Input
                        id={`${arFieldId}-ar-threshold`}
                        type="number"
                        min={0}
                        value={thresholdInput}
                        onChange={(e) => setThresholdInput(e.target.value)}
                        className="border-white/10 bg-zinc-950 text-zinc-100"
                    />
                </div>
                {embed === "default" ? (
                    <div className="space-y-1.5">
                        <Label className="text-xs text-zinc-500">Package to buy</Label>
                        <Select
                            value={packageId != null ? String(packageId) : ""}
                            onValueChange={(v) => setPackageId(v ? Number(v) : null)}
                        >
                            <SelectTrigger className="border-white/10 bg-zinc-950 text-zinc-100">
                                <SelectValue placeholder="Select package" />
                            </SelectTrigger>
                            <SelectContent className="border-white/10 bg-zinc-950 text-zinc-100">
                                {smsPackages.map((pkg) => (
                                    <SelectItem key={pkg.id} value={String(pkg.id)}>
                                        {pkg.name} — +{pkg.sms_count.toLocaleString()} SMS (${Number(pkg.price).toFixed(2)})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                ) : null}
            </div>

            {smsAutoRecharge?.has_payment_method ? (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-white/10 bg-zinc-950/80 px-3 py-2 text-sm">
                    <span className="flex items-center gap-2 text-zinc-300">
                        <CreditCard className="h-4 w-4 text-zinc-500" aria-hidden />
                        <span className="capitalize">{smsAutoRecharge.card_brand ?? "Card"}</span>
                        <span className="tabular-nums text-zinc-400">•••• {smsAutoRecharge.card_last4 ?? "—"}</span>
                    </span>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="border-white/15 text-xs"
                        onClick={() => {
                            router.post(route("newsletter.sms-auto-recharge.remove-payment"), undefined, {
                                preserveScroll: true,
                                onSuccess: () => showSuccessToast("Card removed"),
                                onError: () => showErrorToast("Could not remove card"),
                            })
                        }}
                    >
                        Remove card
                    </Button>
                </div>
            ) : (
                <Button type="button" variant="outline" size="sm" className={cn("w-full sm:w-auto", brandOutlineAccentClass)} asChild>
                    <Link href={route("newsletter.sms-auto-recharge.setup")}>Add card for auto-recharge (Stripe)</Link>
                </Button>
            )}

            <div className="flex items-start gap-2">
                <Checkbox
                    id={`${arFieldId}-ar-policy`}
                    checked={policyAccepted}
                    onCheckedChange={(c) => setPolicyAccepted(c === true)}
                    className="mt-0.5 border-white/20 data-[state=checked]:bg-purple-600"
                />
                <label htmlFor={`${arFieldId}-ar-policy`} className="cursor-pointer text-xs leading-snug text-zinc-500">
                    I authorize Believe Wallet to charge my saved card when my SMS balance is at or below the threshold above (via
                    Stripe). At most one charge per hour while enabled.
                </label>
            </div>

            <div className="flex flex-wrap gap-2">
                <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    className="border border-white/10 bg-zinc-800 text-zinc-200"
                    disabled={prefsSaving}
                    onClick={() => postSmsWalletPrefs(autoRecharge)}
                >
                    {embed === "inBuyDialog" ? "Save threshold" : "Save threshold & package"}
                </Button>
                {smsAutoRecharge?.last_recharge_at ? (
                    <p className="text-xs text-zinc-500">
                        Last auto-recharge:{" "}
                        {new Date(smsAutoRecharge.last_recharge_at).toLocaleString(undefined, {
                            dateStyle: "medium",
                            timeStyle: "short",
                        })}
                    </p>
                ) : null}
            </div>
        </div>
    )

    if (!emailStats && !smsStats) {
        return null
    }

    const emailLow = emailStats ? emailStats.emails_left < 10 : false
    const emailEmpty = emailStats ? emailStats.emails_left === 0 : false

    const emailUsagePct =
        emailStats && emailStats.emails_included > 0
            ? Math.min(100, Math.round((emailStats.emails_used / emailStats.emails_included) * 100))
            : 0

    const tabUsage = statusFilter === "all" || !["draft", "sent"].includes(statusFilter)
    const tabDrafts = statusFilter === "draft"
    const tabSent = statusFilter === "sent"

    const indexUrl = (params?: Record<string, string>) =>
        params && Object.keys(params).length > 0 ? route("newsletter.index", params) : route("newsletter.index")

    const handleBack = () => {
        if (typeof window !== "undefined" && window.history.length > 1) {
            window.history.back()
        } else {
            router.visit(route("newsletter.index"))
        }
    }

    const dialogsOnly = variant === "dialogsOnly"

    return (
        <>
            {!dialogsOnly ? (
            <section
                className={cn(
                    "overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/70 shadow-xl shadow-black/30",
                    "text-zinc-100"
                )}
            >
                {/* Header */}
                <div className="flex flex-col gap-4 border-b border-white/10 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                    <div className="flex items-center gap-2">
                        <Mail className="h-6 w-6 shrink-0 text-purple-400" aria-hidden />
                        <h2 className="text-lg font-semibold tracking-tight text-white sm:text-xl">Email &amp; SMS usage</h2>
                    </div>
                    {showCreateButton ? (
                        <Link href={route("newsletter.create")}>
                            <Button type="button" className={cn("w-full sm:w-auto", brandButtonClass)}>
                                <Plus className="mr-2 h-4 w-4" />
                                Create newsletter
                            </Button>
                        </Link>
                    ) : null}
                </div>

                {/* Tabs — link to filtered newsletter list */}
                <div className="flex border-b border-white/10 px-4 sm:px-6">
                    <Link
                        href={indexUrl()}
                        preserveScroll
                        className={cn(
                            "-mb-px border-b-2 px-3 py-3 text-sm font-medium transition-colors sm:px-4",
                            tabUsage
                                ? "border-purple-500 text-white"
                                : "border-transparent text-zinc-500 hover:text-zinc-300"
                        )}
                    >
                        Usage
                    </Link>
                    <Link
                        href={indexUrl({ status: "draft" })}
                        preserveScroll
                        className={cn(
                            "-mb-px border-b-2 px-3 py-3 text-sm font-medium transition-colors sm:px-4",
                            tabDrafts
                                ? "border-purple-500 text-white"
                                : "border-transparent text-zinc-500 hover:text-zinc-300"
                        )}
                    >
                        Drafts
                    </Link>
                    <Link
                        href={indexUrl({ status: "sent" })}
                        preserveScroll
                        className={cn(
                            "-mb-px border-b-2 px-3 py-3 text-sm font-medium transition-colors sm:px-4",
                            tabSent
                                ? "border-purple-500 text-white"
                                : "border-transparent text-zinc-500 hover:text-zinc-300"
                        )}
                    >
                        Sent
                    </Link>
                </div>

                {/* Blurb + Buy SMS */}
                <div className="flex flex-col gap-3 border-b border-white/5 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                    <p className="max-w-3xl text-sm leading-relaxed text-zinc-400">
                        Newsletter sends use your email quota; SMS and Email + SMS use prepaid SMS credits ($25 = 1,200 SMS). Same
                        balances as <span className="font-medium text-zinc-300">Email Invites</span> for email.
                    </p>
                    {smsStats ? (
                        <Button type="button" size="sm" className={cn("shrink-0", brandButtonClassSm)} onClick={() => setBuySmsOpen(true)}>
                            Buy SMS credits
                        </Button>
                    ) : null}
                </div>

                <div className="space-y-6 p-4 sm:p-6">
                    <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                        {/* Email */}
                        {emailStats && (
                            <div className="space-y-4 rounded-xl border border-white/10 bg-zinc-950/60 p-4 sm:p-5">
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                    <div>
                                        <h3 className="flex items-center gap-2 font-semibold text-white">
                                            <Mail className="h-4 w-4 text-sky-400" />
                                            Email usage
                                        </h3>
                                        <p className="mt-0.5 text-xs text-zinc-500">Quota for email, newsletters and invites</p>
                                    </div>
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        className={cn("shrink-0", brandOutlineAccentClass)}
                                        onClick={() => setBuyEmailOpen(true)}
                                    >
                                        Buy email credits
                                    </Button>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="rounded-lg border border-white/10 bg-black/30 p-3">
                                        <div className="mb-2 flex items-center gap-2">
                                            <div className="rounded-lg bg-sky-500/15 p-2 text-sky-400">
                                                <Send className="h-4 w-4" />
                                            </div>
                                            <span className="text-xs font-medium text-zinc-500">Included</span>
                                        </div>
                                        <p className="text-2xl font-bold tabular-nums text-white">{emailStats.emails_included.toLocaleString()}</p>
                                        <p className="text-xs text-zinc-500">From your plan</p>
                                    </div>
                                    <div className="rounded-lg border border-white/10 bg-black/30 p-3">
                                        <div className="mb-2 flex items-center gap-2">
                                            <div className="rounded-lg bg-purple-500/15 p-2 text-blue-400">
                                                <Send className="h-4 w-4" />
                                            </div>
                                            <span className="text-xs font-medium text-zinc-500">Sent</span>
                                        </div>
                                        <p className="text-2xl font-bold tabular-nums text-white">{emailStats.emails_used.toLocaleString()}</p>
                                        <p className="text-xs text-zinc-500">Total sent</p>
                                    </div>
                                </div>

                                {emailStats.emails_included > 0 && (
                                    <div>
                                        <div className="mb-2 flex items-center justify-between text-xs">
                                            <span className="text-zinc-500">Usage</span>
                                            <span className="tabular-nums text-zinc-400">{emailUsagePct}%</span>
                                        </div>
                                        <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-800">
                                            <div
                                                className={cn(
                                                    "h-full rounded-full transition-all",
                                                    emailStats.emails_used / emailStats.emails_included >= 1
                                                        ? "bg-red-500"
                                                        : emailStats.emails_used / emailStats.emails_included >= 0.8
                                                          ? "bg-amber-500"
                                                          : BRAND_GRADIENT
                                                )}
                                                style={{ width: `${emailUsagePct}%` }}
                                            />
                                        </div>
                                        <p
                                            className={cn(
                                                "mt-2 text-xs",
                                                emailEmpty
                                                    ? "text-red-400"
                                                    : emailLow
                                                      ? "text-amber-400"
                                                      : "text-zinc-500"
                                            )}
                                        >
                                            {emailStats.emails_left.toLocaleString()} remaining
                                        </p>
                                    </div>
                                )}

                                <div className="flex flex-wrap gap-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="flex-1 border-white/15 bg-transparent text-zinc-200 hover:bg-white/10 sm:flex-none"
                                        onClick={() => setBuyEmailOpen(true)}
                                    >
                                        Buy email credits
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="flex-1 border-white/15 bg-transparent text-zinc-200 hover:bg-white/10 sm:flex-none"
                                        onClick={() => setBuySmsOpen(true)}
                                    >
                                        Buy SMS credits
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* SMS */}
                        {smsStats && (
                            <div className="space-y-4 rounded-xl border border-white/10 bg-zinc-950/60 p-4 sm:p-5">
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                    <div>
                                        <h3 className="flex items-center gap-2 font-semibold text-white">
                                            <Smartphone className="h-4 w-4 text-blue-400" />
                                            SMS wallet
                                        </h3>
                                        <p className="mt-0.5 text-xs text-zinc-500">
                                            Premium channel — prepaid credits (standard pack $25 = 1,200 SMS)
                                        </p>
                                    </div>
                                    <Button type="button" size="sm" className={cn("shrink-0", brandButtonClassSm)} onClick={() => setBuySmsOpen(true)}>
                                        Buy SMS credits
                                    </Button>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="rounded-lg border border-white/10 bg-black/30 p-3">
                                        <div className="mb-2 flex items-center gap-2">
                                            <div className="rounded-lg bg-purple-500/15 p-2 text-purple-400">
                                                <Globe className="h-4 w-4" />
                                            </div>
                                            <span className="text-xs font-medium text-zinc-500">Credits included</span>
                                        </div>
                                        <p className="text-2xl font-bold tabular-nums text-white">{smsStats.sms_included.toLocaleString()}</p>
                                        <p className="text-xs text-zinc-500">Prepaid balance</p>
                                    </div>
                                    <div className="rounded-lg border border-white/10 bg-black/30 p-3">
                                        <div className="mb-2 flex items-center gap-2">
                                            <div className="rounded-lg bg-blue-500/15 p-2 text-blue-400">
                                                <Send className="h-4 w-4" />
                                            </div>
                                            <span className="text-xs font-medium text-zinc-500">SMS sent</span>
                                        </div>
                                        <p className="text-2xl font-bold tabular-nums text-white">{smsStats.sms_used.toLocaleString()}</p>
                                        <p className="text-xs text-zinc-500">Total used</p>
                                    </div>
                                </div>

                                <p
                                    className={cn(
                                        "rounded-lg border border-white/5 bg-black/20 px-3 py-2 text-center text-sm",
                                        smsStats.sms_left === 0
                                            ? "text-red-400"
                                            : smsStats.sms_left < 50
                                              ? "text-amber-400"
                                              : "text-emerald-400"
                                    )}
                                >
                                    <span className="text-zinc-500">Available to send: </span>
                                    <span className="font-semibold tabular-nums text-white">{smsStats.sms_left.toLocaleString()}</span>
                                </p>

                                {renderSmsAutoRechargeControls()}
                            </div>
                        )}
                    </div>
                </div>

                {showFooterNav ? (
                    <div className="flex flex-wrap items-center gap-2 border-t border-white/10 px-4 py-4 sm:px-6">
                        <Button type="button" variant="default" className={brandButtonClass} onClick={handleBack}>
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back
                        </Button>
                        <Link href={indexUrl({ status: "draft" })}>
                            <Button type="button" variant="secondary" className="border border-white/10 bg-zinc-800 text-zinc-200 hover:bg-zinc-700">
                                Drafts
                            </Button>
                        </Link>
                    </div>
                ) : null}
            </section>
            ) : null}

            <Dialog open={buyEmailOpen} onOpenChange={setBuyEmailOpen}>
                <DialogContent className="border-white/10 bg-zinc-950 text-zinc-100 sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Buy email credits</DialogTitle>
                        <DialogDescription className="text-zinc-500">
                            Same packages as Email Invites. Each successful send uses one email from your balance.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="max-h-[50vh] space-y-2 overflow-y-auto py-2">
                        {emailPackages.length === 0 ? (
                            <p className="py-6 text-center text-sm text-zinc-500">No email packages configured.</p>
                        ) : (
                            emailPackages.map((pkg) => (
                                <button
                                    key={pkg.id}
                                    type="button"
                                    onClick={() => setSelectedEmailPkgId(pkg.id)}
                                    className={cn(
                                        "w-full rounded-lg border-2 p-4 text-left transition-all",
                                        selectedEmailPkgId === pkg.id ? brandPackageSelectedClass : brandPackageHoverClass
                                    )}
                                >
                                    <div className="flex items-center justify-between gap-2">
                                        <div>
                                            <p className="font-semibold text-white">+{pkg.emails_count.toLocaleString()} emails</p>
                                            <p className="text-sm text-zinc-400">{pkg.name}</p>
                                            {pkg.description && <p className="mt-1 text-xs text-zinc-500">{pkg.description}</p>}
                                        </div>
                                        <p className="text-xl font-bold text-white">${pkg.price.toFixed(2)}</p>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button
                            type="button"
                            variant="outline"
                            className="border-white/15 mr-3 sm:mr-4"
                            onClick={() => setBuyEmailOpen(false)}
                            disabled={purchasingEmail}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            className={brandButtonClass}
                            disabled={!selectedEmailPkgId || purchasingEmail || emailPackages.length === 0}
                            onClick={() => {
                                if (!selectedEmailPkgId) {
                                    showErrorToast("Select a package")
                                    return
                                }
                                setPurchasingEmail(true)
                                router.post(
                                    route("email-invite.purchase-emails"),
                                    {
                                        package_id: selectedEmailPkgId,
                                        ...(checkoutReturnToNewsletter ? { return_to: "newsletter" as const } : {}),
                                    },
                                    {
                                        onError: () => {
                                            showErrorToast("Checkout could not start")
                                            setPurchasingEmail(false)
                                        },
                                    }
                                )
                            }}
                        >
                            {purchasingEmail ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Redirecting…
                                </>
                            ) : (
                                "Pay with card"
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={buySmsOpen} onOpenChange={setBuySmsOpen}>
                <DialogContent className="border-white/10 bg-zinc-950 text-zinc-100 sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Buy SMS credits</DialogTitle>
                        <DialogDescription className="text-zinc-500">
                            Select a package for this purchase. Optional auto-recharge below uses that same package for future top-ups.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="max-h-[min(70vh,32rem)] space-y-4 overflow-y-auto py-2">
                        <div className="space-y-2">
                            {smsPackages.length === 0 ? (
                                <p className="py-6 text-center text-sm text-zinc-500">No SMS packages configured.</p>
                            ) : (
                                smsPackages.map((pkg) => (
                                    <button
                                        key={pkg.id}
                                        type="button"
                                        onClick={() => {
                                            setSelectedSmsId(pkg.id)
                                            setPackageId(pkg.id)
                                        }}
                                        className={cn(
                                            "w-full rounded-lg border-2 p-4 text-left transition-all",
                                            selectedSmsId === pkg.id ? brandPackageSelectedClass : brandPackageHoverClass
                                        )}
                                    >
                                        <div className="flex items-center justify-between gap-2">
                                            <div>
                                                <p className="font-semibold text-white">+{pkg.sms_count.toLocaleString()} SMS</p>
                                                <p className="text-sm text-zinc-400">{pkg.name}</p>
                                                {pkg.description && <p className="mt-1 text-xs text-zinc-500">{pkg.description}</p>}
                                            </div>
                                            <p className="text-xl font-bold text-white">${pkg.price.toFixed(2)}</p>
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>

                        {smsPackages.length > 0 ? (
                            <div className="border-t border-white/10 pt-4">{renderSmsAutoRechargeControls("inBuyDialog")}</div>
                        ) : null}
                    </div>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button
                            type="button"
                            variant="outline"
                            className="border-white/15 mr-3 sm:mr-4"
                            onClick={() => setBuySmsOpen(false)}
                            disabled={purchasingSms}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            disabled={!selectedSmsId || purchasingSms || smsPackages.length === 0}
                            className={brandButtonClass}
                            onClick={() => {
                                if (!selectedSmsId) {
                                    showErrorToast("Select a package")
                                    return
                                }
                                setPurchasingSms(true)
                                router.post(
                                    route("newsletter.purchase-sms"),
                                    {
                                        package_id: selectedSmsId,
                                        ...(checkoutReturnToNewsletter ? { return_to: "newsletter" as const } : {}),
                                    },
                                    {
                                        onError: () => {
                                            showErrorToast("Checkout could not start")
                                            setPurchasingSms(false)
                                        },
                                    }
                                )
                            }}
                        >
                            {purchasingSms ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Redirecting…
                                </>
                            ) : (
                                "Pay with card"
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}

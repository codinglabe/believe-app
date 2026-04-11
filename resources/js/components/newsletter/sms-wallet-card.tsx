"use client"

import { router } from "@inertiajs/react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
import { Label } from "@/components/ui/label"
import { Loader2, Mail, Package, Smartphone, TrendingUp, Send } from "lucide-react"
import { useState } from "react"
import { showErrorToast, showSuccessToast } from "@/lib/toast"

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

interface NewsletterSmsWalletCardProps {
    emailStats?: EmailUsageStats
    emailPackages?: EmailUsagePackage[]
    smsStats?: SmsStats
    smsPackages?: SmsPackage[]
    smsAutoRechargeEnabled?: boolean
}

export function NewsletterSmsWalletCard({
    emailStats,
    emailPackages = [],
    smsStats,
    smsPackages = [],
    smsAutoRechargeEnabled = false,
}: NewsletterSmsWalletCardProps) {
    const [buySmsOpen, setBuySmsOpen] = useState(false)
    const [buyEmailOpen, setBuyEmailOpen] = useState(false)
    const [selectedSmsId, setSelectedSmsId] = useState<number | null>(null)
    const [selectedEmailPkgId, setSelectedEmailPkgId] = useState<number | null>(null)
    const [purchasingSms, setPurchasingSms] = useState(false)
    const [purchasingEmail, setPurchasingEmail] = useState(false)
    const [autoRecharge, setAutoRecharge] = useState(smsAutoRechargeEnabled)

    if (!emailStats && !smsStats) {
        return null
    }

    const saveAutoRecharge = (next: boolean) => {
        setAutoRecharge(next)
        router.post(
            route("newsletter.sms-wallet-preferences"),
            { sms_auto_recharge_enabled: next },
            {
                preserveScroll: true,
                onSuccess: () => showSuccessToast("Preference saved"),
                onError: () => {
                    showErrorToast("Could not save preference")
                    setAutoRecharge(!next)
                },
            }
        )
    }

    const emailLow = emailStats ? emailStats.emails_left < 10 : false
    const emailEmpty = emailStats ? emailStats.emails_left === 0 : false

    return (
        <>
            <Card className="border-violet-200/80 bg-gradient-to-br from-violet-50/90 via-fuchsia-50/50 to-white shadow-lg dark:border-violet-900/50 dark:from-violet-950/40 dark:via-fuchsia-950/30 dark:to-gray-950">
                <CardHeader>
                    <CardTitle className="flex flex-wrap items-center gap-2 text-lg">
                        <Mail className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                        <Smartphone className="h-5 w-5 text-fuchsia-600 dark:text-fuchsia-400" />
                        Email & SMS usage
                    </CardTitle>
                    <CardDescription>
                        Newsletter sends use your email quota; SMS and Email + SMS use prepaid SMS credits ($25 = 1,200 SMS). Same balances as{" "}
                        <span className="font-medium text-foreground">Email Invites</span> for email.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                        {/* Email (matches /email-invite Email Usage) */}
                        {emailStats && (
                            <div className="space-y-4 rounded-xl border border-violet-200/60 bg-white/70 p-4 shadow-sm dark:border-violet-800/50 dark:bg-gray-900/50">
                                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                    <div>
                                        <h3 className="flex items-center gap-2 font-semibold text-foreground">
                                            <Mail className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                            Email usage
                                        </h3>
                                        <p className="text-xs text-muted-foreground">
                                            Quota for email newsletters and invites
                                        </p>
                                    </div>
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        className="shrink-0 border-blue-200/80 bg-blue-50/80 text-blue-900 hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-100"
                                        onClick={() => setBuyEmailOpen(true)}
                                    >
                                        Buy email credits
                                    </Button>
                                </div>

                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                    <div className="rounded-lg border border-border bg-card/80 p-3 shadow-sm">
                                        <div className="mb-2 flex items-center gap-2">
                                            <div className="rounded-lg bg-blue-500/10 p-2 text-blue-600 dark:text-blue-400">
                                                <Package className="h-4 w-4" />
                                            </div>
                                            <p className="text-xs font-medium text-muted-foreground">Included</p>
                                        </div>
                                        <p className="text-2xl font-bold">{emailStats.emails_included.toLocaleString()}</p>
                                        <p className="text-xs text-muted-foreground">From your plan</p>
                                    </div>
                                    <div className="rounded-lg border border-border bg-card/80 p-3 shadow-sm">
                                        <div className="mb-2 flex items-center gap-2">
                                            <div className="rounded-lg bg-purple-500/10 p-2 text-purple-600 dark:text-purple-400">
                                                <Send className="h-4 w-4" />
                                            </div>
                                            <p className="text-xs font-medium text-muted-foreground">Sent</p>
                                        </div>
                                        <p className="text-2xl font-bold">{emailStats.emails_used.toLocaleString()}</p>
                                        <p className="text-xs text-muted-foreground">Total sent</p>
                                    </div>
                                    <div
                                        className={`rounded-lg border p-3 shadow-sm ${
                                            emailEmpty
                                                ? "border-destructive/40 bg-destructive/5"
                                                : emailLow
                                                  ? "border-amber-500/40 bg-amber-500/5"
                                                  : "border-emerald-500/30 bg-emerald-500/5"
                                        }`}
                                    >
                                        <div className="mb-2 flex items-center gap-2">
                                            <div
                                                className={`rounded-lg p-2 ${
                                                    emailEmpty
                                                        ? "bg-destructive/15 text-destructive"
                                                        : emailLow
                                                          ? "bg-amber-500/15 text-amber-700 dark:text-amber-400"
                                                          : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                                                }`}
                                            >
                                                <TrendingUp className="h-4 w-4" />
                                            </div>
                                            <p className="text-xs font-medium text-muted-foreground">Remaining</p>
                                        </div>
                                        <p
                                            className={`text-2xl font-bold ${
                                                emailEmpty
                                                    ? "text-destructive"
                                                    : emailLow
                                                      ? "text-amber-700 dark:text-amber-400"
                                                      : "text-emerald-700 dark:text-emerald-400"
                                            }`}
                                        >
                                            {emailStats.emails_left.toLocaleString()}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {emailEmpty ? "Add credits to send" : emailLow ? "Running low" : "Available"}
                                        </p>
                                    </div>
                                </div>

                                {emailStats.emails_included > 0 && (
                                    <div>
                                        <div className="mb-2 flex items-center justify-between text-xs">
                                            <span className="text-muted-foreground">Usage</span>
                                            <span className="text-muted-foreground">
                                                {Math.round(
                                                    (emailStats.emails_used / emailStats.emails_included) * 100
                                                )}
                                                %
                                            </span>
                                        </div>
                                        <div className="h-2 w-full rounded-full bg-muted">
                                            <div
                                                className={`h-2 rounded-full transition-all ${
                                                    emailStats.emails_used / emailStats.emails_included >= 1
                                                        ? "bg-destructive"
                                                        : emailStats.emails_used / emailStats.emails_included >= 0.8
                                                          ? "bg-amber-500"
                                                          : "bg-primary"
                                                }`}
                                                style={{
                                                    width: `${Math.min(
                                                        100,
                                                        (emailStats.emails_used / emailStats.emails_included) * 100
                                                    )}%`,
                                                }}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* SMS prepaid wallet */}
                        {smsStats && (
                            <div className="space-y-4 rounded-xl border border-fuchsia-200/60 bg-white/70 p-4 shadow-sm dark:border-fuchsia-900/40 dark:bg-gray-900/50">
                                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                    <div>
                                        <h3 className="flex items-center gap-2 font-semibold text-foreground">
                                            <Smartphone className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                                            SMS wallet
                                        </h3>
                                        <p className="text-xs text-muted-foreground">
                                            Premium channel — prepaid credits (standard pack $25 = 1,200 SMS)
                                        </p>
                                    </div>
                                    <Button
                                        type="button"
                                        size="sm"
                                        className="shrink-0 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white hover:from-violet-700 hover:to-fuchsia-700"
                                        onClick={() => setBuySmsOpen(true)}
                                    >
                                        Buy SMS credits
                                    </Button>
                                </div>

                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                    <div className="rounded-lg border border-violet-200/60 bg-white/80 p-3 shadow-sm dark:border-violet-800/50 dark:bg-gray-900/60">
                                        <div className="mb-2 flex items-center gap-2">
                                            <div className="rounded-lg bg-violet-500/15 p-2 text-violet-600 dark:text-violet-400">
                                                <Package className="h-4 w-4" />
                                            </div>
                                            <p className="text-xs font-medium text-muted-foreground">Credits included</p>
                                        </div>
                                        <p className="text-2xl font-bold">{smsStats.sms_included.toLocaleString()}</p>
                                        <p className="text-xs text-muted-foreground">Prepaid balance</p>
                                    </div>
                                    <div className="rounded-lg border border-violet-200/60 bg-white/80 p-3 shadow-sm dark:border-violet-800/50 dark:bg-gray-900/60">
                                        <div className="mb-2 flex items-center gap-2">
                                            <div className="rounded-lg bg-fuchsia-500/15 p-2 text-fuchsia-600 dark:text-fuchsia-400">
                                                <Send className="h-4 w-4" />
                                            </div>
                                            <p className="text-xs font-medium text-muted-foreground">SMS sent</p>
                                        </div>
                                        <p className="text-2xl font-bold">{smsStats.sms_used.toLocaleString()}</p>
                                        <p className="text-xs text-muted-foreground">Total used</p>
                                    </div>
                                    <div
                                        className={`rounded-lg border p-3 shadow-sm ${
                                            smsStats.sms_left === 0
                                                ? "border-destructive/40 bg-destructive/5"
                                                : smsStats.sms_left < 50
                                                  ? "border-amber-500/40 bg-amber-500/5"
                                                  : "border-emerald-500/30 bg-emerald-500/5"
                                        }`}
                                    >
                                        <div className="mb-2 flex items-center gap-2">
                                            <div
                                                className={`rounded-lg p-2 ${
                                                    smsStats.sms_left === 0
                                                        ? "bg-destructive/15 text-destructive"
                                                        : smsStats.sms_left < 50
                                                          ? "bg-amber-500/15 text-amber-700 dark:text-amber-400"
                                                          : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                                                }`}
                                            >
                                                <TrendingUp className="h-4 w-4" />
                                            </div>
                                            <p className="text-xs font-medium text-muted-foreground">Remaining</p>
                                        </div>
                                        <p
                                            className={`text-2xl font-bold ${
                                                smsStats.sms_left === 0
                                                    ? "text-destructive"
                                                    : smsStats.sms_left < 50
                                                      ? "text-amber-700 dark:text-amber-400"
                                                      : "text-emerald-700 dark:text-emerald-400"
                                            }`}
                                        >
                                            {smsStats.sms_left.toLocaleString()}
                                        </p>
                                        <p className="text-xs text-muted-foreground">Available to send</p>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-2 rounded-lg border border-dashed border-violet-300/60 bg-white/50 p-3 dark:border-violet-800/60 dark:bg-gray-900/40 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="space-y-0.5">
                                        <Label htmlFor="sms-auto-recharge" className="text-sm font-medium">
                                            Auto-recharge (coming soon)
                                        </Label>
                                        <p className="text-xs text-muted-foreground">
                                            When enabled, we can top up your SMS wallet when it runs low (Stripe — contact us to activate).
                                        </p>
                                    </div>
                                    <Switch
                                        id="sms-auto-recharge"
                                        checked={autoRecharge}
                                        onCheckedChange={saveAutoRecharge}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            <Dialog open={buyEmailOpen} onOpenChange={setBuyEmailOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Buy email credits</DialogTitle>
                        <DialogDescription>
                            Same packages as Email Invites. Each successful send uses one email from your balance.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="max-h-[50vh] space-y-2 overflow-y-auto py-2">
                        {emailPackages.length === 0 ? (
                            <p className="py-6 text-center text-sm text-muted-foreground">No email packages configured.</p>
                        ) : (
                            emailPackages.map((pkg) => (
                                <button
                                    key={pkg.id}
                                    type="button"
                                    onClick={() => setSelectedEmailPkgId(pkg.id)}
                                    className={`w-full rounded-lg border-2 p-4 text-left transition-all ${
                                        selectedEmailPkgId === pkg.id
                                            ? "border-primary bg-primary/5 shadow-md"
                                            : "border-border hover:border-primary/50"
                                    }`}
                                >
                                    <div className="flex items-center justify-between gap-2">
                                        <div>
                                            <p className="font-semibold">+{pkg.emails_count.toLocaleString()} emails</p>
                                            <p className="text-sm text-muted-foreground">{pkg.name}</p>
                                            {pkg.description && (
                                                <p className="mt-1 text-xs text-muted-foreground">{pkg.description}</p>
                                            )}
                                        </div>
                                        <p className="text-xl font-bold">${pkg.price.toFixed(2)}</p>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setBuyEmailOpen(false)}
                            disabled={purchasingEmail}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            disabled={!selectedEmailPkgId || purchasingEmail || emailPackages.length === 0}
                            onClick={() => {
                                if (!selectedEmailPkgId) {
                                    showErrorToast("Select a package")
                                    return
                                }
                                setPurchasingEmail(true)
                                router.post(
                                    route("email-invite.purchase-emails"),
                                    { package_id: selectedEmailPkgId },
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
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Buy SMS credits</DialogTitle>
                        <DialogDescription>
                            Add prepaid SMS to your organization wallet. Each successful SMS send uses one credit.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="max-h-[50vh] space-y-2 overflow-y-auto py-2">
                        {smsPackages.length === 0 ? (
                            <p className="py-6 text-center text-sm text-muted-foreground">No SMS packages configured.</p>
                        ) : (
                            smsPackages.map((pkg) => (
                                <button
                                    key={pkg.id}
                                    type="button"
                                    onClick={() => setSelectedSmsId(pkg.id)}
                                    className={`w-full rounded-lg border-2 p-4 text-left transition-all ${
                                        selectedSmsId === pkg.id
                                            ? "border-violet-500 bg-violet-500/5 shadow-md"
                                            : "border-border hover:border-violet-400/60"
                                    }`}
                                >
                                    <div className="flex items-center justify-between gap-2">
                                        <div>
                                            <p className="font-semibold">+{pkg.sms_count.toLocaleString()} SMS</p>
                                            <p className="text-sm text-muted-foreground">{pkg.name}</p>
                                            {pkg.description && (
                                                <p className="mt-1 text-xs text-muted-foreground">{pkg.description}</p>
                                            )}
                                        </div>
                                        <p className="text-xl font-bold">${pkg.price.toFixed(2)}</p>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button type="button" variant="outline" onClick={() => setBuySmsOpen(false)} disabled={purchasingSms}>
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            disabled={!selectedSmsId || purchasingSms || smsPackages.length === 0}
                            className="bg-gradient-to-r from-violet-600 to-fuchsia-600"
                            onClick={() => {
                                if (!selectedSmsId) {
                                    showErrorToast("Select a package")
                                    return
                                }
                                setPurchasingSms(true)
                                router.post(
                                    route("newsletter.purchase-sms"),
                                    { package_id: selectedSmsId },
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

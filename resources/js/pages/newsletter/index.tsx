"use client"

import { Head, Link, router } from "@inertiajs/react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import AppSidebarLayout from "@/layouts/app/app-sidebar-layout"
import {
    NewsletterSmsWalletCard,
    type EmailUsagePackage,
    type EmailUsageStats,
    type SmsAutoRechargeDetails,
    type SmsPackage,
    type SmsStats,
} from "@/components/newsletter/sms-wallet-card"
import { ConfirmationModal } from "@/components/confirmation-modal"
import { useEffect, useRef, useState } from "react"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationLink,
} from "@/components/admin/Pagination"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { LucideIcon } from "lucide-react"
import {
    CalendarClock,
    CheckCircle2,
    CircleDashed,
    FilePenLine,
    Loader2,
    Pause,
    Plus,
    Send,
    Eye,
    Search,
    X,
    Download,
    ChevronDown,
    LayoutGrid,
    Sparkles,
    Mail,
    Smartphone,
    ShoppingCart,
    XCircle,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
    brandButtonClass,
    brandButtonClassSm,
    brandChipClass,
    brandPaginationActiveClass,
    brandSolidClass,
} from "@/lib/brand-styles"

const EMAIL_QUOTA_LOW_THRESHOLD = 10
const SMS_CREDITS_LOW_THRESHOLD = 50

const INERTIA_ONLY = ["newsletters", "stats", "search", "statusFilter"] as const

interface Newsletter {
    id: number
    subject: string
    status: "draft" | "paused" | "scheduled" | "sending" | "sent" | "failed"
    scheduled_at?: string
    scheduled_at_formatted?: string
    send_date?: string
    send_date_formatted?: string
    sent_at?: string
    sent_at_formatted?: string
    updated_at_formatted?: string
    schedule_type?: "immediate" | "scheduled" | "recurring"
    total_recipients: number
    sent_count: number
    delivered_count: number
    opened_count: number
    clicked_count: number
    template?: {
        name: string
    } | null
    organization: {
        name: string
    }
}

interface Template {
    id: number
    name: string
    template_type: string
    is_active: boolean
}

interface Stats {
    total_newsletters: number
    sent_newsletters: number
    total_recipients: number
    avg_open_rate: number
    avg_click_rate: number
}

interface NewsletterIndexProps {
    newsletters: {
        data: Newsletter[]
        links: { url: string | null; label: string; active: boolean }[]
        meta: { total?: number }
    }
    templates: Template[]
    stats: Stats
    emailStats?: EmailUsageStats
    emailPackages?: EmailUsagePackage[]
    smsStats?: SmsStats
    smsPackages?: SmsPackage[]
    smsAutoRechargeEnabled?: boolean
    smsAutoRecharge?: SmsAutoRechargeDetails | null
    search?: string
    statusFilter?: string
}

const STATUS_TABS = [
    { id: "all" as const, label: "All" },
    { id: "draft" as const, label: "Draft" },
    { id: "scheduled" as const, label: "Scheduled" },
    { id: "sent" as const, label: "Sent" },
]

/** Pill styles for each newsletter row status (dark table). */
function newsletterStatusBadgeClass(status: string): string {
    switch (status) {
        case "sent":
            return "border-emerald-500/40 bg-emerald-500/15 text-emerald-200"
        case "scheduled":
            return "border-sky-500/40 bg-sky-500/15 text-sky-200"
        case "draft":
            return "border-amber-500/40 bg-amber-500/12 text-amber-200"
        case "sending":
            return "border-yellow-400/45 bg-yellow-400/12 text-yellow-100"
        case "paused":
            return "border-orange-500/40 bg-orange-500/12 text-orange-200"
        case "failed":
            return "border-red-500/45 bg-red-500/12 text-red-200"
        default:
            return "border-zinc-600 bg-zinc-800/70 text-zinc-300"
    }
}

function newsletterStatusIcon(status: string): LucideIcon {
    switch (status) {
        case "sent":
            return CheckCircle2
        case "scheduled":
            return CalendarClock
        case "draft":
            return FilePenLine
        case "sending":
            return Loader2
        case "paused":
            return Pause
        case "failed":
            return XCircle
        default:
            return CircleDashed
    }
}

function NewsletterStatusBadge({ status }: { status: string }) {
    const Icon = newsletterStatusIcon(status)
    return (
        <Badge
            variant="outline"
            className={cn(
                "gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold capitalize shadow-none",
                newsletterStatusBadgeClass(status)
            )}
        >
            <Icon
                className={cn("size-3 shrink-0", status === "sending" && "animate-spin")}
                aria-hidden
            />
            {status}
        </Badge>
    )
}

function DateColumn({ newsletter }: { newsletter: Newsletter }) {
    if (newsletter.status === "sent" && newsletter.sent_at_formatted) {
        const [datePart, ...rest] = newsletter.sent_at_formatted.split(",")
        const timePart = rest.join(",").trim()
        return (
            <div className="text-sm">
                <p className="font-medium text-zinc-100">{datePart.trim()}</p>
                {timePart ? <p className="text-xs text-zinc-500">{timePart}</p> : null}
            </div>
        )
    }
    if (newsletter.status === "scheduled" && (newsletter.send_date_formatted || newsletter.scheduled_at_formatted)) {
        const primary = newsletter.send_date_formatted || newsletter.scheduled_at_formatted || ""
        return (
            <div className="text-sm">
                <p className="font-medium text-zinc-100">{primary}</p>
                <p className="text-xs text-zinc-500">Scheduled send</p>
            </div>
        )
    }
    if (newsletter.updated_at_formatted) {
        return (
            <div className="text-sm">
                <p className="text-zinc-400">Last edited</p>
                <p className="font-medium text-zinc-200">{newsletter.updated_at_formatted}</p>
            </div>
        )
    }
    return <span className="text-sm text-zinc-500">—</span>
}

export default function NewsletterIndex({
    newsletters,
    stats: _stats,
    emailStats,
    emailPackages,
    smsStats,
    smsPackages,
    smsAutoRechargeEnabled,
    smsAutoRecharge,
    search: searchFromServer = "",
    statusFilter: statusFromServer = "all",
}: NewsletterIndexProps) {
    const [showSuccessMessage, setShowSuccessMessage] = useState(false)
    const [successMessage, setSuccessMessage] = useState("")
    const [isSendModalOpen, setIsSendModalOpen] = useState(false)
    const [newsletterToSend, setNewsletterToSend] = useState<Newsletter | null>(null)
    const [searchTerm, setSearchTerm] = useState(searchFromServer)
    const [statusFilter, setStatusFilter] = useState(statusFromServer)
    const filterEffectMounted = useRef(false)
    const [buyEmailDialogOpen, setBuyEmailDialogOpen] = useState(false)
    const [buySmsDialogOpen, setBuySmsDialogOpen] = useState(false)

    useEffect(() => {
        setSearchTerm(searchFromServer)
        setStatusFilter(statusFromServer)
    }, [searchFromServer, statusFromServer])

    const [showErrorMessage, setShowErrorMessage] = useState(false)
    const [errorMessage, setErrorMessage] = useState("")

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search)
        const success = urlParams.get("success")
        if (success) {
            setSuccessMessage(decodeURIComponent(success))
            setShowSuccessMessage(true)
        }
        const err = urlParams.get("error")
        if (err) {
            setErrorMessage(decodeURIComponent(err))
            setShowErrorMessage(true)
        }
        const openBuy = urlParams.get("open_buy")
        if (openBuy === "email") {
            setBuyEmailDialogOpen(true)
        }
        if (openBuy === "sms") {
            setBuySmsDialogOpen(true)
        }

        const stripKeys = ["success", "error", "open_buy", "canceled"] as const
        let changed = false
        stripKeys.forEach((k) => {
            if (urlParams.has(k)) {
                urlParams.delete(k)
                changed = true
            }
        })
        if (changed) {
            const qs = urlParams.toString()
            const next = window.location.pathname + (qs ? `?${qs}` : "") + window.location.hash
            window.history.replaceState({}, "", next)
        }
    }, [])

    const pushFilters = (nextSearch: string, nextStatus: string) => {
        const params: Record<string, string> = {}
        if (nextSearch.trim()) params.search = nextSearch.trim()
        if (nextStatus !== "all") params.status = nextStatus
        router.get(route("newsletter.index"), params, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
            only: [...INERTIA_ONLY],
        })
    }

    useEffect(() => {
        if (!filterEffectMounted.current) {
            filterEffectMounted.current = true
            return
        }
        const delay = searchTerm.trim() ? 400 : 0
        const timer = window.setTimeout(() => {
            pushFilters(searchTerm, statusFilter)
        }, delay)
        return () => window.clearTimeout(timer)
    }, [searchTerm, statusFilter])

    const setTabOrStatus = (next: string) => {
        setStatusFilter(next)
    }

    const tabIsActive = (id: string) => {
        if (id === "all") {
            return statusFilter === "all" || ["sending", "paused", "failed"].includes(statusFilter)
        }
        return statusFilter === id
    }

    const totalOnPage = newsletters.meta?.total ?? newsletters.data.length

    const emailLowBalance =
        emailStats != null && emailStats.emails_left < EMAIL_QUOTA_LOW_THRESHOLD
    const smsLowBalance = smsStats != null && smsStats.sms_left < SMS_CREDITS_LOW_THRESHOLD
    /** Low balance — show buy affordance even if no packages (dialog explains). */
    const showBuyEmailToolbar = emailStats != null && emailLowBalance
    const showBuySmsToolbar = smsStats != null && smsLowBalance

    return (
        <AppSidebarLayout>
            <Head title="Newsletter Dashboard" />

            <div className="min-h-[calc(100vh-4rem)] w-full max-w-none bg-zinc-950 px-4 py-6 sm:px-6 lg:px-8 xl:px-10">
                <div className="w-full max-w-none space-y-6">
                    {showSuccessMessage && (
                        <motion.div
                            initial={{ opacity: 0, y: -12 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-950/50 px-4 py-3 text-emerald-100"
                        >
                            <span className="text-sm font-medium">{successMessage}</span>
                            <button
                                type="button"
                                onClick={() => setShowSuccessMessage(false)}
                                className="rounded-md p-1 text-emerald-300 hover:bg-emerald-900/50"
                                aria-label="Dismiss"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </motion.div>
                    )}

                    {showErrorMessage && (
                        <motion.div
                            initial={{ opacity: 0, y: -12 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex items-center justify-between rounded-xl border border-red-500/35 bg-red-950/40 px-4 py-3 text-red-100"
                        >
                            <span className="text-sm font-medium">{errorMessage}</span>
                            <button
                                type="button"
                                onClick={() => setShowErrorMessage(false)}
                                className="rounded-md p-1 text-red-300 hover:bg-red-900/50"
                                aria-label="Dismiss"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </motion.div>
                    )}

                    {/* Header */}
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Newsletter Dashboard</h1>
                            <p className="mt-1 max-w-xl text-sm text-zinc-500">
                                Drafts, scheduled sends, and completed newsletters in one place.
                            </p>
                        </div>
                        <Link href={route("newsletter.create")}>
                            <Button className={cn("w-full sm:w-auto", brandButtonClass)}>
                                <Plus className="mr-2 h-4 w-4" />
                                Create newsletter
                            </Button>
                        </Link>
                    </div>

                    {/* Sub-toolbar: quick nav + credit badges */}
                    <div className="flex flex-col gap-3 rounded-xl border border-white/10 bg-zinc-900/60 px-3 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                        <div className="flex flex-wrap items-center gap-2">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="border-white/15 bg-zinc-950/80 text-zinc-200 hover:bg-zinc-800"
                                    >
                                        <LayoutGrid className="mr-2 h-4 w-4" />
                                        Newsletters
                                        <ChevronDown className="ml-2 h-3.5 w-3.5 opacity-60" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start" className="w-56 border-white/10 bg-zinc-950 text-zinc-100">
                                    <DropdownMenuItem asChild className="focus:bg-zinc-800">
                                        <Link href={route("newsletter.create")}>New newsletter</Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem asChild className="focus:bg-zinc-800">
                                        <Link href={route("newsletter.templates")}>Templates</Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator className="bg-white/10" />
                                    <DropdownMenuItem asChild className="focus:bg-zinc-800">
                                        <Link href={route("newsletter.create-advanced")}>Advanced composer</Link>
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>

                            <div className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-zinc-950 px-3 py-1 text-xs font-medium text-zinc-300">
                                <span className="text-zinc-500">Newsletters</span>
                                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-600/90 px-1.5 text-[11px] font-semibold text-white">
                                    {totalOnPage}
                                </span>
                            </div>

                            {emailStats && (
                                <div className="inline-flex items-center gap-1">
                                    <div
                                        className={cn(
                                            "inline-flex max-w-full flex-wrap items-center gap-x-2 gap-y-1 rounded-full border bg-zinc-950 px-3 py-1.5 text-xs font-medium text-zinc-300",
                                            emailLowBalance ? "border-amber-500/45" : "border-white/10"
                                        )}
                                        title="Email quota: included in your plan and sent so far"
                                    >
                                        <span className="flex shrink-0 items-center gap-1.5">
                                            <Mail className="h-3.5 w-3.5 text-sky-400" aria-hidden />
                                            <span className="text-zinc-500">Email</span>
                                        </span>
                                        <span className="hidden h-3 w-px shrink-0 bg-white/10 sm:block" aria-hidden />
                                        <span className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
                                            <span className="tabular-nums font-semibold text-white">
                                                {emailStats.emails_included.toLocaleString()}
                                            </span>
                                            <span className="text-zinc-500">included</span>
                                            <span className="text-zinc-600">·</span>
                                            <span className="tabular-nums font-semibold text-white">
                                                {emailStats.emails_used.toLocaleString()}
                                            </span>
                                            <span className="text-zinc-500">sent</span>
                                        </span>
                                    </div>
                                    {showBuyEmailToolbar ? (
                                        <Button
                                            type="button"
                                            size="icon"
                                            className={cn("h-8 w-8 shrink-0", brandButtonClassSm)}
                                            aria-label="Buy email credits"
                                            title="Buy email credits"
                                            onClick={() => setBuyEmailDialogOpen(true)}
                                        >
                                            <ShoppingCart className="h-4 w-4" aria-hidden />
                                        </Button>
                                    ) : null}
                                </div>
                            )}

                            {smsStats && (
                                <div className="inline-flex items-center gap-1">
                                    <div
                                        className={cn(
                                            "inline-flex max-w-full flex-wrap items-center gap-x-2 gap-y-1 rounded-full border bg-zinc-950 px-3 py-1.5 text-xs font-medium text-zinc-300",
                                            smsLowBalance ? "border-amber-500/45" : "border-white/10"
                                        )}
                                        title="SMS credits: included in your balance and sent so far"
                                    >
                                        <span className="flex shrink-0 items-center gap-1.5">
                                            <Smartphone className="h-3.5 w-3.5 text-blue-400" aria-hidden />
                                            <span className="text-zinc-500">SMS credits</span>
                                        </span>
                                        <span className="hidden h-3 w-px shrink-0 bg-white/10 sm:block" aria-hidden />
                                        <span className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
                                            <span className="tabular-nums font-semibold text-white">
                                                {smsStats.sms_included.toLocaleString()}
                                            </span>
                                            <span className="text-zinc-500">included</span>
                                            <span className="text-zinc-600">·</span>
                                            <span className="tabular-nums font-semibold text-white">
                                                {smsStats.sms_used.toLocaleString()}
                                            </span>
                                            <span className="text-zinc-500">sent</span>
                                        </span>
                                    </div>
                                    {showBuySmsToolbar ? (
                                        <Button
                                            type="button"
                                            size="icon"
                                            className={cn("h-8 w-8 shrink-0", brandButtonClassSm)}
                                            aria-label="Buy SMS credits"
                                            title="Buy SMS credits"
                                            onClick={() => setBuySmsDialogOpen(true)}
                                        >
                                            <ShoppingCart className="h-4 w-4" aria-hidden />
                                        </Button>
                                    ) : null}
                                </div>
                            )}
                        </div>

                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
                            onClick={() => {
                                const params = new URLSearchParams()
                                if (searchTerm) params.append("search", searchTerm)
                                if (statusFilter !== "all") params.append("status", statusFilter)
                                window.location.href = route("newsletter.export") + (params.toString() ? "?" + params.toString() : "")
                            }}
                        >
                            <Download className="mr-2 h-4 w-4" />
                            Export CSV
                        </Button>
                    </div>

                    {/* Search + filter */}
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                        <div className="relative min-w-0 flex-1">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                            <Input
                                placeholder="Search your newsletters…"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="border-white/10 bg-zinc-900/80 pl-9 pr-9 text-zinc-100 placeholder:text-zinc-600"
                                aria-label="Search newsletters"
                            />
                            {searchTerm ? (
                                <button
                                    type="button"
                                    onClick={() => setSearchTerm("")}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-zinc-500 hover:bg-white/10 hover:text-zinc-200"
                                    aria-label="Clear search"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            ) : null}
                        </div>
                        <div className="w-full shrink-0 sm:w-56">
                            <Select value={statusFilter} onValueChange={setTabOrStatus}>
                                <SelectTrigger className="border-white/10 bg-zinc-900/80 text-zinc-100" aria-label="All newsletters">
                                    <SelectValue placeholder="All newsletters" />
                                </SelectTrigger>
                                <SelectContent className="border-white/10 bg-zinc-950 text-zinc-100">
                                    <SelectItem value="all">All newsletters</SelectItem>
                                    <SelectItem value="draft">Drafts</SelectItem>
                                    <SelectItem value="scheduled">Scheduled</SelectItem>
                                    <SelectItem value="sent">Sent</SelectItem>
                                    <SelectItem value="sending">Sending</SelectItem>
                                    <SelectItem value="paused">Paused</SelectItem>
                                    <SelectItem value="failed">Failed</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Main card: tabs + table */}
                    <div className="overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/40 shadow-xl shadow-black/20">
                        <div className="flex flex-col gap-3 border-b border-white/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                            <div className="inline-flex flex-wrap gap-1 rounded-lg bg-zinc-950/80 p-1" aria-label="Newsletter status filters">
                                {STATUS_TABS.map((tab) => (
                                    <button
                                        key={tab.id}
                                        type="button"
                                        onClick={() => setTabOrStatus(tab.id)}
                                        className={cn(
                                            "rounded-md px-3 py-1.5 text-xs font-semibold transition-colors sm:text-sm",
                                            tabIsActive(tab.id)
                                                ? brandSolidClass
                                                : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
                                        )}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                                <Select value={statusFilter} onValueChange={setTabOrStatus}>
                                    <SelectTrigger className="h-9 min-w-[150px] border-white/10 bg-zinc-950 text-xs text-zinc-200">
                                        <SelectValue placeholder="All newsletters" />
                                    </SelectTrigger>
                                    <SelectContent className="border-white/10 bg-zinc-950 text-zinc-100">
                                        <SelectItem value="all">All newsletters</SelectItem>
                                        <SelectItem value="draft">Draft</SelectItem>
                                        <SelectItem value="scheduled">Scheduled</SelectItem>
                                        <SelectItem value="sent">Sent</SelectItem>
                                        <SelectItem value="sending">Sending</SelectItem>
                                        <SelectItem value="paused">Paused</SelectItem>
                                        <SelectItem value="failed">Failed</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            {newsletters.data.length > 0 ? (
                                <Table>
                                    <TableHeader>
                                        <TableRow className="border-white/10 hover:bg-transparent">
                                            <TableHead className="w-[140px] text-xs font-semibold uppercase tracking-wide text-zinc-500">
                                                Status
                                            </TableHead>
                                            <TableHead className="min-w-[200px] text-xs font-semibold uppercase tracking-wide text-zinc-500">
                                                Subject
                                            </TableHead>
                                            <TableHead className="w-[110px] text-xs font-semibold uppercase tracking-wide text-zinc-500">
                                                Recipients
                                            </TableHead>
                                            <TableHead className="min-w-[160px] text-xs font-semibold uppercase tracking-wide text-zinc-500">
                                                Date
                                            </TableHead>
                                            <TableHead className="min-w-[180px] whitespace-nowrap text-right text-xs font-semibold uppercase tracking-wide text-zinc-500">
                                                Actions
                                            </TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {newsletters.data.map((newsletter) => (
                                            <TableRow
                                                key={newsletter.id}
                                                className="border-white/10 hover:bg-white/[0.03]"
                                            >
                                                <TableCell>
                                                    <NewsletterStatusBadge status={newsletter.status} />
                                                </TableCell>
                                                <TableCell>
                                                    <p className="font-semibold text-zinc-100">{newsletter.subject || "(No subject)"}</p>
                                                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                                                        {newsletter.template?.name ? (
                                                            <span className="rounded-md border border-white/10 bg-zinc-950 px-2 py-0.5 text-[11px] text-zinc-400">
                                                                {newsletter.template.name}
                                                            </span>
                                                        ) : null}
                                                        {newsletter.organization?.name ? (
                                                            <span className={cn("rounded-md px-2 py-0.5 text-[11px]", brandChipClass)}>
                                                                {newsletter.organization.name}
                                                            </span>
                                                        ) : null}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="tabular-nums text-zinc-300">{newsletter.total_recipients}</TableCell>
                                                <TableCell>
                                                    <DateColumn newsletter={newsletter} />
                                                </TableCell>
                                                <TableCell className="w-[1%] whitespace-nowrap text-right">
                                                    <div className="inline-flex flex-nowrap items-center justify-end gap-2">
                                                        <Link href={route("newsletter.show", newsletter.id)} className="inline-flex shrink-0">
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                size="sm"
                                                                className="border-white/15 bg-transparent text-zinc-200 hover:bg-white/10"
                                                            >
                                                                <Eye className="mr-1.5 h-3.5 w-3.5" />
                                                                View
                                                            </Button>
                                                        </Link>
                                                        {newsletter.status !== "sent" ? (
                                                            <Button
                                                                type="button"
                                                                size="sm"
                                                                className={cn("shrink-0", brandButtonClassSm)}
                                                                onClick={() => {
                                                                    setNewsletterToSend(newsletter)
                                                                    setIsSendModalOpen(true)
                                                                }}
                                                            >
                                                                <Send className="mr-1.5 h-3.5 w-3.5" />
                                                                Send
                                                            </Button>
                                                        ) : null}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            ) : (
                                <div className="px-6 py-16 text-center">
                                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-purple-600/25 to-blue-600/25 text-purple-300">
                                        <Sparkles className="h-6 w-6" aria-hidden />
                                    </div>
                                    <h3 className="mt-4 text-lg font-semibold text-white">No newsletters match</h3>
                                    <p className="mx-auto mt-2 max-w-md text-sm text-zinc-500">
                                        Try another filter or create a new newsletter.
                                    </p>
                                    <Link href={route("newsletter.create")} className="mt-6 inline-block">
                                        <Button className={brandButtonClass}>
                                            <Plus className="mr-2 h-4 w-4" />
                                            Create newsletter
                                        </Button>
                                    </Link>
                                </div>
                            )}
                        </div>

                        {newsletters.links && newsletters.links.length > 3 && (
                            <div className="flex items-center justify-end gap-2 border-t border-white/10 px-4 py-4 sm:px-5">
                                <Pagination className="mx-0 w-auto justify-end">
                                    <PaginationContent className="justify-end">
                                        {newsletters.links.map((link, index) => {
                                            if (link.url === null) {
                                                return (
                                                    <PaginationItem key={index}>
                                                        <span
                                                            className="px-3 py-2 text-sm text-zinc-600"
                                                            dangerouslySetInnerHTML={{ __html: link.label }}
                                                        />
                                                    </PaginationItem>
                                                )
                                            }
                                            return (
                                                <PaginationItem key={index}>
                                                    <PaginationLink
                                                        href={link.url || "#"}
                                                        isActive={link.active}
                                                        className={cn(link.active && brandPaginationActiveClass)}
                                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                                    />
                                                </PaginationItem>
                                            )
                                        })}
                                    </PaginationContent>
                                </Pagination>
                            </div>
                        )}
                    </div>

                    {(emailStats || smsStats) && (
                        <NewsletterSmsWalletCard
                            variant="dialogsOnly"
                            checkoutReturnToNewsletter
                            emailStats={emailStats}
                            emailPackages={emailPackages}
                            smsStats={smsStats}
                            smsPackages={smsPackages}
                            smsAutoRechargeEnabled={smsAutoRechargeEnabled ?? false}
                            smsAutoRecharge={smsAutoRecharge ?? null}
                            statusFilter={statusFilter}
                            showCreateButton={false}
                            showFooterNav={false}
                            buyEmailDialogOpen={buyEmailDialogOpen}
                            onBuyEmailDialogOpenChange={setBuyEmailDialogOpen}
                            buySmsDialogOpen={buySmsDialogOpen}
                            onBuySmsDialogOpenChange={setBuySmsDialogOpen}
                        />
                    )}

                    <ConfirmationModal
                        isOpen={isSendModalOpen}
                        onChange={setIsSendModalOpen}
                        title="Send Newsletter"
                        description={`Are you sure you want to send "${newsletterToSend?.subject}" immediately? This will override any scheduled time.`}
                        confirmLabel="Send Now"
                        cancelLabel="Cancel"
                        onConfirm={() => {
                            if (newsletterToSend) {
                                const form = document.createElement("form")
                                form.method = "POST"
                                form.action = route("newsletter.manual-send", newsletterToSend.id)
                                const token = document.createElement("input")
                                token.type = "hidden"
                                token.name = "_token"
                                token.value = document.querySelector('meta[name="csrf-token"]')?.getAttribute("content") || ""
                                form.appendChild(token)
                                document.body.appendChild(form)
                                form.submit()
                            }
                        }}
                    />
                </div>
            </div>
        </AppSidebarLayout>
    )
}

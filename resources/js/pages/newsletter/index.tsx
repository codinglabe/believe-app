"use client"

import { Head } from "@inertiajs/react"
import { motion } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Link } from "@inertiajs/react"
import AppSidebarLayout from "@/layouts/app/app-sidebar-layout"
import {
    NewsletterSmsWalletCard,
    type EmailUsagePackage,
    type EmailUsageStats,
    type SmsPackage,
    type SmsStats,
} from "@/components/newsletter/sms-wallet-card"
import { ConfirmationModal } from "@/components/confirmation-modal"
import { useEffect, useRef, useState } from "react"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious, PaginationEllipsis } from "@/components/admin/Pagination"
import { router } from "@inertiajs/react"
import {
    Mail,
    Users,
    Eye,
    MousePointer,
    Plus,
    FileText,
    Send,
    Edit,
    Pause,
    Clock,
    CheckCircle,
    XCircle,
    Target,
    Search,
    Filter,
    X,
    Download,
    ChevronRight,
    Sparkles,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface Newsletter {
    id: number
    subject: string
    status: 'draft' | 'paused' | 'scheduled' | 'sending' | 'sent' | 'failed'
    scheduled_at?: string
    scheduled_at_formatted?: string
    send_date?: string
    send_date_formatted?: string
    sent_at?: string
    sent_at_formatted?: string
    schedule_type?: 'immediate' | 'scheduled' | 'recurring'
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
        links: any[]
        meta: any
    }
    templates: Template[]
    stats: Stats
    emailStats?: EmailUsageStats
    emailPackages?: EmailUsagePackage[]
    smsStats?: SmsStats
    smsPackages?: SmsPackage[]
    smsAutoRechargeEnabled?: boolean
}

export default function NewsletterIndex({
    newsletters,
    templates,
    stats,
    emailStats,
    emailPackages,
    smsStats,
    smsPackages,
    smsAutoRechargeEnabled,
}: NewsletterIndexProps) {
    const [showSuccessMessage, setShowSuccessMessage] = useState(false)
    const [successMessage, setSuccessMessage] = useState('')
    const [isSendModalOpen, setIsSendModalOpen] = useState(false)
    const [newsletterToSend, setNewsletterToSend] = useState<Newsletter | null>(null)
    const [searchTerm, setSearchTerm] = useState('')
    const [statusFilter, setStatusFilter] = useState<string>('all')
    const filterEffectMounted = useRef(false)

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search)
        const success = urlParams.get('success')
        if (success) {
            setSuccessMessage(decodeURIComponent(success))
            setShowSuccessMessage(true)
        }
    }, [])

    useEffect(() => {
        if (!filterEffectMounted.current) {
            filterEffectMounted.current = true
            return
        }
        const delay = searchTerm.trim() ? 400 : 0
        const timer = window.setTimeout(() => {
            const params: Record<string, string> = {}
            if (searchTerm.trim()) params.search = searchTerm.trim()
            if (statusFilter !== 'all') params.status = statusFilter
            router.get(route('newsletter.index'), params, {
                preserveState: true,
                replace: true,
            })
        }, delay)
        return () => window.clearTimeout(timer)
    }, [searchTerm, statusFilter])

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'draft': return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
            case 'paused': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
            case 'scheduled': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
            case 'sending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
            case 'sent': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
            case 'failed': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
            default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
        }
    }

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'draft': return <Edit className="h-4 w-4" />
            case 'paused': return <Pause className="h-4 w-4" />
            case 'scheduled': return <Clock className="h-4 w-4" />
            case 'sending': return <Send className="h-4 w-4" />
            case 'sent': return <CheckCircle className="h-4 w-4" />
            case 'failed': return <XCircle className="h-4 w-4" />
            default: return <Edit className="h-4 w-4" />
        }
    }

    // Dates are already formatted in backend with user's timezone - just use them directly

    const statCardClass =
        "border border-border/60 bg-card shadow-sm transition-colors hover:border-violet-300/40 dark:hover:border-violet-800/50"

    return (
        <AppSidebarLayout>
            <Head title="Newsletters" />

            <div className="w-full max-w-none animate-in fade-in duration-500 space-y-8 px-4 py-6 sm:px-6 lg:px-8">
                {showSuccessMessage && (
                    <motion.div
                        initial={{ opacity: 0, y: -12 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center justify-between rounded-xl border border-emerald-200/80 bg-emerald-50 px-4 py-3 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-100"
                    >
                        <span className="text-sm font-medium">{successMessage}</span>
                        <button
                            type="button"
                            onClick={() => setShowSuccessMessage(false)}
                            className="rounded-md p-1 text-emerald-700 hover:bg-emerald-100 dark:text-emerald-300 dark:hover:bg-emerald-900/50"
                            aria-label="Dismiss"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </motion.div>
                )}

                {/* Hero: what this page is + main actions */}
                <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                    <div className="max-w-2xl space-y-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-violet-600 dark:text-violet-400">
                            Communications
                        </p>
                        <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Newsletters</h1>
                        <p className="text-base text-muted-foreground leading-relaxed">
                            See every draft, scheduled send, and completed campaign in one place. Start something new, or open a row to
                            review stats and recipients.
                        </p>
                    </div>
                    <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center lg:justify-end">
                        <Link href={route('newsletter.create')}>
                            <Button
                                size="lg"
                                className="w-full bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-md hover:from-violet-700 hover:to-fuchsia-700 sm:w-auto"
                            >
                                <Plus className="mr-2 h-5 w-5" />
                                Create newsletter
                            </Button>
                        </Link>
                        <Link href={route('newsletter.create-advanced')}>
                            <Button size="lg" variant="outline" className="w-full border-border/80 sm:w-auto">
                                <Target className="mr-2 h-4 w-4" />
                                Advanced
                            </Button>
                        </Link>
                        <Button
                            size="lg"
                            variant="ghost"
                            className="w-full text-muted-foreground sm:w-auto"
                            onClick={() => {
                                const params = new URLSearchParams()
                                if (searchTerm) params.append('search', searchTerm)
                                if (statusFilter !== 'all') params.append('status', statusFilter)
                                window.location.href = route('newsletter.export') + (params.toString() ? '?' + params.toString() : '')
                            }}
                        >
                            <Download className="mr-2 h-4 w-4" />
                            Export CSV
                        </Button>
                    </div>
                </div>

                <NewsletterSmsWalletCard
                    emailStats={emailStats}
                    emailPackages={emailPackages}
                    smsStats={smsStats}
                    smsPackages={smsPackages}
                    smsAutoRechargeEnabled={smsAutoRechargeEnabled}
                />

                {/* At-a-glance metrics */}
                <section aria-label="Overview statistics">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <Card className={statCardClass}>
                            <CardContent className="p-5">
                                <div className="flex items-start gap-4">
                                    <div className="rounded-lg bg-violet-500/10 p-2.5 text-violet-600 dark:text-violet-400">
                                        <Mail className="h-5 w-5" aria-hidden />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-xs font-medium text-muted-foreground">Campaigns</p>
                                        <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">{stats.total_newsletters}</p>
                                        <p className="mt-0.5 text-xs text-muted-foreground">{stats.sent_newsletters} sent so far</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className={statCardClass}>
                            <CardContent className="p-5">
                                <div className="flex items-start gap-4">
                                    <div className="rounded-lg bg-emerald-500/10 p-2.5 text-emerald-600 dark:text-emerald-400">
                                        <Users className="h-5 w-5" aria-hidden />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-xs font-medium text-muted-foreground">Recipients (all sends)</p>
                                        <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">{stats.total_recipients}</p>
                                        <p className="mt-0.5 text-xs text-muted-foreground">Total audience reach</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className={statCardClass}>
                            <CardContent className="p-5">
                                <div className="flex items-start gap-4">
                                    <div className="rounded-lg bg-sky-500/10 p-2.5 text-sky-600 dark:text-sky-400">
                                        <Eye className="h-5 w-5" aria-hidden />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-xs font-medium text-muted-foreground">Avg. open rate</p>
                                        <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">{stats.avg_open_rate}%</p>
                                        <p className="mt-0.5 text-xs text-muted-foreground">Rough benchmark ~21%</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className={statCardClass}>
                            <CardContent className="p-5">
                                <div className="flex items-start gap-4">
                                    <div className="rounded-lg bg-amber-500/10 p-2.5 text-amber-600 dark:text-amber-400">
                                        <MousePointer className="h-5 w-5" aria-hidden />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-xs font-medium text-muted-foreground">Avg. click rate</p>
                                        <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">{stats.avg_click_rate}%</p>
                                        <p className="mt-0.5 text-xs text-muted-foreground">Rough benchmark ~2.6%</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </section>

                {/* Setup shortcuts — plain language */}
                <div className="rounded-xl border border-border/60 bg-muted/30 p-4 sm:p-5">
                    <p className="mb-3 text-sm font-medium text-foreground">Before you send</p>
                    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
                        <Link
                            href={route('newsletter.templates')}
                            className="group inline-flex items-center gap-2 text-sm font-medium text-violet-600 hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300"
                        >
                            <FileText className="h-4 w-4 shrink-0" />
                            Reusable templates
                            <ChevronRight className="h-4 w-4 opacity-60 transition-transform group-hover:translate-x-0.5" />
                        </Link>
                        <span className="hidden text-muted-foreground sm:inline" aria-hidden>
                            ·
                        </span>
                        <Link
                            href={route('newsletter.recipients')}
                            className="group inline-flex items-center gap-2 text-sm font-medium text-violet-600 hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300"
                        >
                            <Users className="h-4 w-4 shrink-0" />
                            Who receives mail & SMS
                            <ChevronRight className="h-4 w-4 opacity-60 transition-transform group-hover:translate-x-0.5" />
                        </Link>
                    </div>
                </div>

                {/* Find & filter */}
                <Card className="border border-border/60 shadow-sm">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base">Find a campaign</CardTitle>
                        <CardDescription>Search by subject or related text. Filter by where it is in the pipeline.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-0">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                            <div className="relative flex-1">
                                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    placeholder="Search by subject, template, or organization…"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="border-border/80 pl-9 pr-9"
                                    aria-label="Search newsletters"
                                />
                                {searchTerm ? (
                                    <button
                                        type="button"
                                        onClick={() => setSearchTerm('')}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                                        aria-label="Clear search"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                ) : null}
                            </div>
                            <div className="w-full sm:w-[200px]">
                                <Select value={statusFilter} onValueChange={setStatusFilter}>
                                    <SelectTrigger className="border-border/80" aria-label="Filter by status">
                                        <Filter className="mr-2 h-4 w-4 shrink-0 opacity-60" />
                                        <SelectValue placeholder="Status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All statuses</SelectItem>
                                        <SelectItem value="draft">Draft — not sent yet</SelectItem>
                                        <SelectItem value="scheduled">Scheduled</SelectItem>
                                        <SelectItem value="sending">Sending</SelectItem>
                                        <SelectItem value="sent">Sent</SelectItem>
                                        <SelectItem value="paused">Paused</SelectItem>
                                        <SelectItem value="failed">Failed</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* List */}
                <Card className="border border-border/60 shadow-sm">
                    <CardHeader className="flex flex-row flex-wrap items-end justify-between gap-4 border-b border-border/60 pb-4">
                        <div>
                            <CardTitle className="text-lg">Your campaigns</CardTitle>
                            <CardDescription>
                                Open one to see opens, clicks, and delivery. Use <strong className="font-medium text-foreground">Send</strong> only
                                when you are ready to dispatch (it sends now and overrides a schedule).
                            </CardDescription>
                        </div>
                        <p className="text-sm tabular-nums text-muted-foreground">
                            {newsletters.data.length} of {newsletters.meta?.total ?? newsletters.data.length} on this page
                        </p>
                    </CardHeader>
                    <CardContent className="pt-6">
                        {newsletters.data.length > 0 ? (
                            <ul className="space-y-3" role="list">
                                {newsletters.data.map((newsletter) => (
                                    <li
                                        key={newsletter.id}
                                        className={cn(
                                            "min-w-0 rounded-xl border border-border/60 bg-card/80 p-4 transition-colors",
                                            "hover:border-violet-300/50 hover:bg-muted/30 dark:hover:border-violet-800/40"
                                        )}
                                    >
                                        <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-start lg:justify-between lg:gap-6">
                                            <div className="min-w-0 flex-1 space-y-3">
                                                <div className="flex flex-wrap items-center gap-2 gap-y-2">
                                                    <h2 className="min-w-0 flex-1 text-base font-semibold leading-snug text-foreground sm:text-lg">
                                                        <span className="sr-only">Subject: </span>
                                                        {newsletter.subject || "(No subject)"}
                                                    </h2>
                                                    <Badge
                                                        className={cn(
                                                            "inline-flex shrink-0 items-center gap-1 border-0 capitalize",
                                                            getStatusColor(newsletter.status)
                                                        )}
                                                    >
                                                        {getStatusIcon(newsletter.status)}
                                                        {newsletter.status}
                                                    </Badge>
                                                </div>
                                                <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2 xl:grid-cols-4">
                                                    <div>
                                                        <dt className="text-xs font-medium text-muted-foreground">Template</dt>
                                                        <dd className="truncate text-foreground">
                                                            {newsletter.template?.name ?? 'None'}
                                                        </dd>
                                                    </div>
                                                    <div>
                                                        <dt className="text-xs font-medium text-muted-foreground">Recipients</dt>
                                                        <dd className="tabular-nums text-foreground">{newsletter.total_recipients}</dd>
                                                    </div>
                                                    {newsletter.sent_at_formatted ? (
                                                        <div>
                                                            <dt className="text-xs font-medium text-muted-foreground">Sent</dt>
                                                            <dd className="text-foreground">{newsletter.sent_at_formatted}</dd>
                                                        </div>
                                                    ) : null}
                                                    {newsletter.send_date_formatted || newsletter.scheduled_at_formatted ? (
                                                        <div>
                                                            <dt className="text-xs font-medium text-muted-foreground">Scheduled for</dt>
                                                            <dd className="text-foreground">
                                                                {newsletter.send_date_formatted || newsletter.scheduled_at_formatted}
                                                                {newsletter.schedule_type && newsletter.schedule_type !== "immediate" ? (
                                                                    <span className="ml-1 text-muted-foreground">({newsletter.schedule_type})</span>
                                                                ) : null}
                                                            </dd>
                                                        </div>
                                                    ) : null}
                                                </dl>
                                            </div>
                                            <div className="flex min-w-0 w-full flex-wrap items-center justify-end gap-2 lg:max-w-md xl:max-w-lg">
                                                <Link
                                                    href={route('newsletter.show', newsletter.id)}
                                                    className="inline-flex min-w-0 shrink-0"
                                                >
                                                    <Button variant="outline" size="sm" className="border-border/80 whitespace-nowrap">
                                                        <Eye className="mr-2 h-4 w-4 shrink-0" />
                                                        View
                                                    </Button>
                                                </Link>
                                                {newsletter.status !== "sent" ? (
                                                    <Button
                                                        size="sm"
                                                        className="shrink-0 whitespace-nowrap bg-emerald-600 text-white hover:bg-emerald-700"
                                                        onClick={() => {
                                                            setNewsletterToSend(newsletter)
                                                            setIsSendModalOpen(true)
                                                        }}
                                                    >
                                                        <Send className="mr-2 h-4 w-4 shrink-0" />
                                                        Send now
                                                    </Button>
                                                ) : null}
                                            </div>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <div className="rounded-xl border border-dashed border-border/80 bg-muted/20 px-6 py-12 text-center">
                                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-violet-500/10 text-violet-600 dark:text-violet-400">
                                    <Sparkles className="h-6 w-6" aria-hidden />
                                </div>
                                <h3 className="mt-4 text-lg font-semibold text-foreground">Nothing here yet</h3>
                                <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground leading-relaxed">
                                    Create a newsletter to reach your list. You can reuse a template and schedule sends from the editor.
                                </p>
                                <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
                                    <Link href={route('newsletter.create')}>
                                        <Button className="bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white hover:from-violet-700 hover:to-fuchsia-700">
                                            <Plus className="mr-2 h-4 w-4" />
                                            Create newsletter
                                        </Button>
                                    </Link>
                                    <Link href={route('newsletter.templates')}>
                                        <Button variant="outline" className="border-border/80">
                                            <FileText className="mr-2 h-4 w-4" />
                                            Browse templates
                                        </Button>
                                    </Link>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Pagination */}
                {newsletters.links && newsletters.links.length > 3 && (
                    <div className="flex justify-center mt-6">
                        <Pagination>
                            <PaginationContent>
                                {newsletters.links.map((link: any, index: number) => {
                                    if (link.url === null) {
                                        return (
                                            <PaginationItem key={index}>
                                                <span className="px-3 py-2 text-gray-400 cursor-not-allowed" dangerouslySetInnerHTML={{ __html: link.label }} />
                                            </PaginationItem>
                                        )
                                    }
                                    return (
                                        <PaginationItem key={index}>
                                            <PaginationLink
                                                href={link.url || '#'}
                                                isActive={link.active}
                                                dangerouslySetInnerHTML={{ __html: link.label }}
                                            />
                                        </PaginationItem>
                                    )
                                })}
                            </PaginationContent>
                        </Pagination>
                    </div>
                )}

                {/* Send Confirmation Modal */}
                <ConfirmationModal
                    isOpen={isSendModalOpen}
                    onChange={setIsSendModalOpen}
                    title="Send Newsletter"
                    description={`Are you sure you want to send "${newsletterToSend?.subject}" immediately? This will override any scheduled time.`}
                    confirmLabel="Send Now"
                    cancelLabel="Cancel"
                    onConfirm={() => {
                        if (newsletterToSend) {
                            const form = document.createElement('form');
                            form.method = 'POST';
                            form.action = route('newsletter.manual-send', newsletterToSend.id);
                            
                            const token = document.createElement('input');
                            token.type = 'hidden';
                            token.name = '_token';
                            token.value = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
                            
                            form.appendChild(token);
                            document.body.appendChild(form);
                            form.submit();
                        }
                    }}
                />
            </div>
        </AppSidebarLayout>
    )
}

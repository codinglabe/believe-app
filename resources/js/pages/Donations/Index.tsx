"use client"

import { Head, router } from "@inertiajs/react"
import AppSidebarLayout from "@/layouts/app/app-sidebar-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
    HeartHandshake,
    DollarSign,
    Calendar,
    User,
    Mail,
    CreditCard,
    ChevronLeft,
    ChevronRight,
} from "lucide-react"
import { format } from "date-fns"

interface Donation {
    id: number
    user_id: number
    organization_id: number
    amount: number
    frequency: string
    payment_method: string
    transaction_id: string
    status: string
    messages: string | null
    created_at: string
    user?: {
        id: number
        name: string
        email: string
    } | null
}

interface PaginatedDonations {
    data: Donation[]
    current_page: number
    last_page: number
    per_page: number
    total: number
    from?: number | null
    to?: number | null
}

interface DonationStats {
    total_amount: number
    total_count: number
    completed_count: number
    active_recurring_count: number
    pending_count: number
    rejected_count: number
}

interface DonationsIndexProps {
    donations: PaginatedDonations
    organization: {
        id: number
        name: string
    }
    stats: DonationStats
    filters: { status: string }
}

const STATUS_FILTERS = [
    { value: "all", label: "All" },
    { value: "pending", label: "Pending" },
    { value: "completed", label: "Completed" },
    { value: "active", label: "Active" },
    { value: "rejected", label: "Rejected" },
    { value: "canceled", label: "Canceled" },
    { value: "failed", label: "Failed" },
] as const

export default function DonationsIndex({ donations, organization, stats, filters }: DonationsIndexProps) {
    const getStatusBadge = (status: string) => {
        const statusConfig: Record<string, { color: string; label: string }> = {
            completed: { color: "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200", label: "Completed" },
            active: { color: "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200", label: "Active" },
            pending: { color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200", label: "Pending" },
            rejected: { color: "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200", label: "Rejected" },
            failed: { color: "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200", label: "Failed" },
            canceled: { color: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300", label: "Canceled" },
        }

        const config = statusConfig[status] ?? statusConfig.pending

        return <Badge className={config.color}>{config.label}</Badge>
    }

    const getFrequencyBadge = (frequency: string) => {
        const frequencyConfig: Record<string, { color: string; label: string }> = {
            "one-time": { color: "bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-200", label: "One-time" },
            weekly: { color: "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200", label: "Weekly" },
            monthly: { color: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-200", label: "Monthly" },
        }

        const config = frequencyConfig[frequency] ?? frequencyConfig["one-time"]

        return (
            <Badge variant="outline" className={config.color}>
                {config.label}
            </Badge>
        )
    }

    const paymentMethodLabel = (paymentMethod: string | null | undefined): string => {
        if (!paymentMethod) return "Unknown"

        const labels: Record<string, string> = {
            stripe: "Card/Stripe",
            stripe_card: "Card",
            stripe_ach: "ACH",
            venmo: "Venmo",
            venmo_manual: "Venmo",
            cash_app_pay: "Cash App Pay",
            cashapp: "Cash App",
            zelle: "Zelle",
            paypal: "PayPal",
            believe_points: "Believe Points",
            link: "Link",
        }

        return labels[paymentMethod] ?? paymentMethod.replace(/_/g, " ")
    }

    const getPaymentMethodBadge = (paymentMethod: string | null | undefined) => {
        if (!paymentMethod) return null

        return (
            <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300" variant="outline">
                <CreditCard className="h-3 w-3 mr-1" />
                {paymentMethodLabel(paymentMethod)}
            </Badge>
        )
    }

    const formatAmount = (amount: number) => {
        const value = Number(amount)
        if (!Number.isFinite(value)) return "$0.00"

        return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
            minimumFractionDigits: 2,
        }).format(value)
    }

    const applyStatusFilter = (status: string) => {
        router.get(
            route("donations.index"),
            { status },
            { preserveState: true, preserveScroll: true },
        )
    }

    const handlePageChange = (page: number) => {
        router.get(
            route("donations.index"),
            { status: filters.status, page },
            { preserveState: true, preserveScroll: true },
        )
    }

    const filterLabel = STATUS_FILTERS.find((f) => f.value === filters.status)?.label ?? "All"
    const listTitle = filters.status === "all"
        ? `All Donations (${stats.total_count})`
        : `${filterLabel} Donations (${donations.total})`

    return (
        <AppSidebarLayout>
            <Head title="Donations" />

            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl py-4 px-4 md:py-6 md:px-10">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
                            <HeartHandshake className="h-7 w-7 sm:h-8 sm:w-8" />
                            Donations
                        </h1>
                        <p className="text-muted-foreground mt-1 text-sm sm:text-base">
                            View all donations received by {organization.name}
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Received</CardTitle>
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{formatAmount(stats.total_amount)}</div>
                            <p className="text-xs text-muted-foreground mt-1">
                                {stats.total_count} total donation{stats.total_count !== 1 ? "s" : ""}
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Completed</CardTitle>
                            <HeartHandshake className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.completed_count}</div>
                            <p className="text-xs text-muted-foreground mt-1">Successful donations</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Active Recurring</CardTitle>
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.active_recurring_count}</div>
                            <p className="text-xs text-muted-foreground mt-1">Ongoing subscriptions</p>
                        </CardContent>
                    </Card>
                </div>

                <Card>
                    <CardHeader>
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <CardTitle className="flex items-center gap-2">
                                    <HeartHandshake className="h-5 w-5" />
                                    {listTitle}
                                </CardTitle>
                                <CardDescription>
                                    {filters.status === "all"
                                        ? "Complete list of all donations received"
                                        : `Showing ${filterLabel.toLowerCase()} donations only`}
                                </CardDescription>
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-2 pt-2">
                            {STATUS_FILTERS.map(({ value, label }) => (
                                <Button
                                    key={value}
                                    variant={filters.status === value ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => applyStatusFilter(value)}
                                >
                                    {label}
                                    {value === "pending" && stats.pending_count > 0 && (
                                        <span className="ml-1.5 rounded-full bg-yellow-500/20 px-1.5 text-xs">
                                            {stats.pending_count}
                                        </span>
                                    )}
                                </Button>
                            ))}
                        </div>
                    </CardHeader>
                    <CardContent>
                        {donations.data.length === 0 ? (
                            <div className="text-center py-12 text-muted-foreground">
                                <HeartHandshake className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                <p>
                                    {filters.status === "all"
                                        ? "No donations received yet"
                                        : `No ${filterLabel.toLowerCase()} donations`}
                                </p>
                                <p className="text-sm mt-2">
                                    {filters.status === "all"
                                        ? "Donations will appear here once supporters make contributions"
                                        : "Try another status filter to see more results"}
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {donations.data.map((donation) => (
                                    <div
                                        key={donation.id}
                                        className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 border rounded-xl hover:shadow-md transition-all duration-300 bg-card"
                                    >
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-3 mb-2">
                                                <div className="flex-shrink-0">
                                                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                                        <User className="h-5 w-5 text-primary" />
                                                    </div>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-semibold text-base truncate">
                                                        {donation.user?.name || "Anonymous Donor"}
                                                    </p>
                                                    {donation.user?.email && (
                                                        <p className="text-sm text-muted-foreground truncate flex items-center gap-1">
                                                            <Mail className="h-3 w-3" />
                                                            {donation.user.email}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                            {donation.messages && (
                                                <p className="text-sm text-muted-foreground mt-2 pl-13 italic">
                                                    &ldquo;{donation.messages}&rdquo;
                                                </p>
                                            )}
                                        </div>

                                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 flex-shrink-0">
                                            <div className="text-right">
                                                <p className="text-2xl font-bold text-primary">
                                                    {formatAmount(donation.amount)}
                                                </p>
                                                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                                                    <Calendar className="h-3 w-3" />
                                                    {format(new Date(donation.created_at), "MMM dd, yyyy")}
                                                </p>
                                            </div>
                                            <div className="flex flex-col gap-2">
                                                {getStatusBadge(donation.status)}
                                                {getFrequencyBadge(donation.frequency)}
                                                {getPaymentMethodBadge(donation.payment_method)}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {donations.last_page > 1 && (
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 pt-6 border-t">
                                <div className="text-sm text-muted-foreground">
                                    Showing{" "}
                                    <span className="font-semibold text-foreground">{donations.from ?? 0}</span> to{" "}
                                    <span className="font-semibold text-foreground">{donations.to ?? 0}</span> of{" "}
                                    <span className="font-semibold text-foreground">{donations.total}</span>{" "}
                                    {filters.status === "all" ? "donations" : `${filterLabel.toLowerCase()} donations`}
                                </div>

                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handlePageChange(donations.current_page - 1)}
                                        disabled={donations.current_page <= 1}
                                    >
                                        <ChevronLeft className="h-4 w-4" />
                                        <span className="hidden sm:inline ml-1">Previous</span>
                                    </Button>

                                    <div className="flex items-center gap-1">
                                        {Array.from({ length: Math.min(5, donations.last_page) }, (_, i) => {
                                            let pageNum: number
                                            if (donations.last_page <= 5) {
                                                pageNum = i + 1
                                            } else if (donations.current_page <= 3) {
                                                pageNum = i + 1
                                            } else if (donations.current_page >= donations.last_page - 2) {
                                                pageNum = donations.last_page - 4 + i
                                            } else {
                                                pageNum = donations.current_page - 2 + i
                                            }

                                            return (
                                                <Button
                                                    key={pageNum}
                                                    variant={donations.current_page === pageNum ? "default" : "outline"}
                                                    size="sm"
                                                    onClick={() => handlePageChange(pageNum)}
                                                >
                                                    {pageNum}
                                                </Button>
                                            )
                                        })}
                                    </div>

                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handlePageChange(donations.current_page + 1)}
                                        disabled={donations.current_page >= donations.last_page}
                                    >
                                        <span className="hidden sm:inline mr-1">Next</span>
                                        <ChevronRight className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </AppSidebarLayout>
    )
}

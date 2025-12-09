"use client"

import { Head } from "@inertiajs/react"
import React from "react"
import AppSidebarLayout from "@/layouts/app/app-sidebar-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
    HeartHandshake, 
    DollarSign, 
    Calendar,
    User,
    Mail
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
    }
}

interface PaginatedDonations {
    data: Donation[]
    current_page: number
    last_page: number
    per_page: number
    total: number
    from?: number
    to?: number
}

interface DonationsIndexProps {
    donations: PaginatedDonations
    organization: {
        id: number
        name: string
    }
}

export default function DonationsIndex({ donations, organization }: DonationsIndexProps) {
    const getStatusBadge = (status: string) => {
        const statusConfig = {
            completed: { color: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200', label: 'Completed' },
            active: { color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200', label: 'Active' },
            pending: { color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200', label: 'Pending' },
            failed: { color: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200', label: 'Failed' },
            canceled: { color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300', label: 'Canceled' },
        }

        const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending

        return (
            <Badge className={config.color}>
                {config.label}
            </Badge>
        )
    }

    const getFrequencyBadge = (frequency: string) => {
        const frequencyConfig = {
            'one-time': { color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-200', label: 'One-time' },
            weekly: { color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200', label: 'Weekly' },
            monthly: { color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-200', label: 'Monthly' },
        }

        const config = frequencyConfig[frequency as keyof typeof frequencyConfig] || frequencyConfig['one-time']

        return (
            <Badge variant="outline" className={config.color}>
                {config.label}
            </Badge>
        )
    }

    const formatAmount = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
        }).format(amount)
    }

    return (
        <AppSidebarLayout>
            <Head title="Donations" />
            
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl py-4 px-4 md:py-6 md:px-10">
                {/* Header */}
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

                {/* Stats Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Donations</CardTitle>
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {formatAmount(donations.data.reduce((sum, donation) => sum + donation.amount, 0))}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                                {donations.total} total donation{donations.total !== 1 ? 's' : ''}
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Completed</CardTitle>
                            <HeartHandshake className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {donations.data.filter(d => d.status === 'completed').length}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                                Successful donations
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Active Recurring</CardTitle>
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {donations.data.filter(d => d.status === 'active' && d.frequency !== 'one-time').length}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                                Ongoing subscriptions
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* Donations List */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <HeartHandshake className="h-5 w-5" />
                            All Donations ({donations.total})
                        </CardTitle>
                        <CardDescription>
                            Complete list of all donations received
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {donations.data.length === 0 ? (
                            <div className="text-center py-12 text-muted-foreground">
                                <HeartHandshake className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                <p>No donations received yet</p>
                                <p className="text-sm mt-2">
                                    Donations will appear here once supporters make contributions
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
                                                        {donation.user?.name || 'Anonymous Donor'}
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
                                                    "{donation.messages}"
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
                                                    {format(new Date(donation.created_at), 'MMM dd, yyyy')}
                                                </p>
                                            </div>
                                            <div className="flex flex-col gap-2">
                                                {getStatusBadge(donation.status)}
                                                {getFrequencyBadge(donation.frequency)}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Pagination Info */}
                        {donations.total > donations.per_page && (
                            <div className="mt-6 text-center text-sm text-muted-foreground">
                                Showing {donations.from || 0} to {donations.to || 0} of {donations.total} donations
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </AppSidebarLayout>
    )
}





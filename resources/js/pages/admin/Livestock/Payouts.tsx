"use client"

import LivestockDashboardLayout from "@/layouts/livestock/LivestockDashboardLayout"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { router, Head } from "@inertiajs/react"
import { useState } from "react"
import { CheckCircle, DollarSign, Calendar } from "lucide-react"
import { format } from "date-fns"
import { showSuccessToast, showErrorToast } from '@/lib/toast'
import type { BreadcrumbItem } from "@/types"

const breadcrumbs: BreadcrumbItem[] = [
    { title: "Admin", href: "#" },
    { title: "Livestock", href: route('admin.index') },
    { title: "Payouts", href: route('admin.payouts') },
]

interface User {
    id: number
    name: string
}

interface Payout {
    id: number
    amount: number
    currency: string
    payout_type: string
    status: string
    user: User
    created_at: string
    paid_at: string | null
}

interface PayoutsProps {
    payouts: {
        data: Payout[]
        links: { url: string | null; label: string; active: boolean }[]
        current_page: number
        last_page: number
        total: number
    }
    filters: {
        status?: string
    }
}

export default function AdminPayouts({ payouts, filters }: PayoutsProps) {
    const [selectedStatus, setSelectedStatus] = useState(filters.status || '')

    const handleStatusChange = (status: string) => {
        setSelectedStatus(status)
        const params: Record<string, string> = {}
        if (status) params.status = status
        
        router.get(route('admin.payouts'), params, {
            preserveState: true,
            replace: true
        })
    }

    const handleApprove = (id: number) => {
        router.put(route('admin.payouts.approve', id), {}, {
            onSuccess: () => {
                showSuccessToast('Payout approved and marked as paid.')
            },
            onError: () => {
                showErrorToast('Failed to approve payout.')
            }
        })
    }

    return (
        <LivestockDashboardLayout breadcrumbs={breadcrumbs}>
            <Head title="Manage Payouts - Admin" />
            
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Manage Payouts</h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">
                        Approve and process seller payouts
                    </p>
                </div>

                {/* Filters */}
                <Card>
                    <CardContent className="p-4">
                        <select
                            value={selectedStatus}
                            onChange={(e) => handleStatusChange(e.target.value)}
                            className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2"
                        >
                            <option value="">All Status</option>
                            <option value="pending">Pending</option>
                            <option value="paid">Paid</option>
                            <option value="failed">Failed</option>
                            <option value="cancelled">Cancelled</option>
                        </select>
                    </CardContent>
                </Card>

                {/* Payouts List */}
                {payouts.data.length > 0 ? (
                    <div className="space-y-4">
                        {payouts.data.map((payout) => (
                            <Card key={payout.id}>
                                <CardContent className="p-6">
                                    <div className="flex items-center justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                                    ${payout.amount.toLocaleString()} {payout.currency}
                                                </h3>
                                                <Badge variant={
                                                    payout.status === 'paid' ? 'default' :
                                                    payout.status === 'pending' ? 'secondary' : 'destructive'
                                                }>
                                                    {payout.status}
                                                </Badge>
                                            </div>
                                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                                                {payout.payout_type.replace('_', ' ')} • {payout.user.name}
                                            </p>
                                            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-500">
                                                <Calendar className="h-3 w-3" />
                                                {format(new Date(payout.created_at), 'MMM dd, yyyy')}
                                                {payout.paid_at && (
                                                    <>
                                                        <span>•</span>
                                                        Paid: {format(new Date(payout.paid_at), 'MMM dd, yyyy')}
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                        {payout.status === 'pending' && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleApprove(payout.id)}
                                                className="text-green-600 hover:text-green-700"
                                            >
                                                <CheckCircle className="h-4 w-4 mr-1" />
                                                Approve
                                            </Button>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                ) : (
                    <Card>
                        <CardContent className="p-12 text-center">
                            <DollarSign className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                            <p className="text-gray-600 dark:text-gray-400">No payouts found.</p>
                        </CardContent>
                    </Card>
                )}
            </div>
        </LivestockDashboardLayout>
    )
}




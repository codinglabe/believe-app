"use client"

import React, { useState } from "react"
import { Head, Link, router } from "@inertiajs/react"
import AppLayout from "@/layouts/app-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { 
    Users, 
    Search,
    Mail,
    DollarSign,
    Calendar,
    ArrowLeft,
    Coins,
    CheckCircle2,
    XCircle
} from "lucide-react"
import { motion } from "framer-motion"
import type { BreadcrumbItem } from "@/types"
interface CurrentPlan {
    id: number
    name: string
    price: number
    frequency: string
}

interface Subscriber {
    id: number
    name: string
    email: string
    current_plan: CurrentPlan | null
    status: 'active' | 'cancelled'
    subscribed_at: string
    cancelled_at?: string | null
    credits: number
}

interface Plan {
    id: number
    name: string
    price: number
    frequency: string
}

interface SubscribersProps {
    subscribers: {
        data: Subscriber[]
        current_page: number
        last_page: number
        per_page: number
        total: number
        links: any[]
    }
    plans: Plan[]
    filters: {
        search: string
        plan: string
        status: string
    }
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Plans Management', href: '/admin/plans' },
    { title: 'Subscribers', href: '/admin/plans/subscribers' },
]

export default function AdminPlansSubscribers({ subscribers, plans, filters }: SubscribersProps) {
    const [search, setSearch] = useState(filters.search || '')
    const [planFilter, setPlanFilter] = useState(filters.plan || 'all')
    const [statusFilter, setStatusFilter] = useState(filters.status || 'all')

    const handleSearch = () => {
        router.get(route('admin.plans.subscribers'), {
            search: search || undefined,
            plan: planFilter !== 'all' ? planFilter : undefined,
            status: statusFilter !== 'all' ? statusFilter : undefined,
        }, {
            preserveState: true,
            replace: true,
        })
    }

    const handlePlanFilterChange = (value: string) => {
        setPlanFilter(value)
        router.get(route('admin.plans.subscribers'), {
            search: search || undefined,
            plan: value !== 'all' ? value : undefined,
            status: statusFilter !== 'all' ? statusFilter : undefined,
        }, {
            preserveState: true,
            replace: true,
        })
    }

    const handleStatusFilterChange = (value: string) => {
        setStatusFilter(value)
        router.get(route('admin.plans.subscribers'), {
            search: search || undefined,
            plan: planFilter !== 'all' ? planFilter : undefined,
            status: value !== 'all' ? value : undefined,
        }, {
            preserveState: true,
            replace: true,
        })
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Subscribers - Plans Management" />
            
            <div className="space-y-6 p-4 sm:p-6">
                {/* Header Section */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                <Users className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Subscribers</h1>
                                <p className="text-gray-600 dark:text-gray-400 mt-1">
                                    View all users with subscription plans (active and cancelled). Total: {subscribers.total} subscribers
                                </p>
                            </div>
                        </div>
                    </div>
                    <Link href={route('admin.plans.index')}>
                        <Button variant="outline">
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back to Plans
                        </Button>
                    </Link>
                </div>

                {/* Filters */}
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex flex-col sm:flex-row gap-4">
                            <div className="flex-1">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <Input
                                        placeholder="Search by name or email..."
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                handleSearch()
                                            }
                                        }}
                                        className="pl-10"
                                    />
                                </div>
                            </div>
                            <div className="w-full sm:w-64">
                                <Select value={planFilter} onValueChange={handlePlanFilterChange}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Filter by plan" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Plans</SelectItem>
                                        {plans.map((plan) => (
                                            <SelectItem key={plan.id} value={plan.id.toString()}>
                                                {plan.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="w-full sm:w-48">
                                <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Filter by status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Status</SelectItem>
                                        <SelectItem value="active">Active</SelectItem>
                                        <SelectItem value="cancelled">Cancelled</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <Button onClick={handleSearch}>
                                <Search className="h-4 w-4 mr-2" />
                                Search
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Subscribers List */}
                {subscribers.data.length === 0 ? (
                    <Card>
                        <CardContent className="pt-12 pb-12 text-center">
                            <Users className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                            <p className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                                No subscribers found
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                {search || planFilter !== 'all' 
                                    ? 'Try adjusting your search or filters'
                                    : 'No users have subscribed to any plans yet'}
                            </p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 gap-4">
                        {subscribers.data.map((subscriber, index) => (
                            <motion.div
                                key={subscriber.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3, delay: index * 0.05 }}
                            >
                                <Card className="hover:shadow-lg transition-shadow">
                                    <CardContent className="pt-6">
                                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                            <div className="flex-1">
                                                <div className="flex items-start gap-4">
                                                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                                        <Users className="h-6 w-6 text-primary" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                                                            {subscriber.name}
                                                        </h3>
                                                        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-2">
                                                            <Mail className="h-4 w-4" />
                                                            <span>{subscriber.email}</span>
                                                        </div>
                                                        {subscriber.current_plan && (
                                                            <div className="flex items-center gap-3 flex-wrap">
                                                                <Badge className={`${
                                                                    subscriber.status === 'active' 
                                                                        ? 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400' 
                                                                        : 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-400'
                                                                }`}>
                                                                    {subscriber.status === 'active' ? (
                                                                        <>
                                                                            <CheckCircle2 className="h-3 w-3 mr-1" />
                                                                            Active
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <XCircle className="h-3 w-3 mr-1" />
                                                                            Cancelled
                                                                        </>
                                                                    )}
                                                                </Badge>
                                                                <Badge className="bg-primary/10 text-primary border-primary/20">
                                                                    {subscriber.current_plan.name}
                                                                </Badge>
                                                                <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
                                                                    <DollarSign className="h-3 w-3" />
                                                                    <span>${subscriber.current_plan.price}/{subscriber.current_plan.frequency}</span>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex flex-col sm:items-end gap-2">
                                                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                                    <Coins className="h-4 w-4" />
                                                    <span>{subscriber.credits.toLocaleString()} credits</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                                    <Calendar className="h-4 w-4" />
                                                    <span>
                                                        Subscribed: {subscriber.subscribed_at 
                                                            ? new Date(subscriber.subscribed_at).toLocaleDateString()
                                                            : 'N/A'}
                                                    </span>
                                                </div>
                                                {subscriber.cancelled_at && (
                                                    <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
                                                        <XCircle className="h-4 w-4" />
                                                        <span>
                                                            Cancelled: {new Date(subscriber.cancelled_at).toLocaleDateString()}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        ))}
                    </div>
                )}

                {/* Pagination */}
                {subscribers.last_page > 1 && (
                    <div className="flex items-center justify-between">
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                            Showing {((subscribers.current_page - 1) * subscribers.per_page) + 1} to{' '}
                            {Math.min(subscribers.current_page * subscribers.per_page, subscribers.total)} of{' '}
                            {subscribers.total} subscribers
                        </div>
                        <div className="flex gap-2">
                            {subscribers.links.map((link, index) => (
                                <Button
                                    key={index}
                                    variant={link.active ? 'default' : 'outline'}
                                    size="sm"
                                    disabled={!link.url}
                                    onClick={() => {
                                        if (link.url) {
                                            const url = new URL(link.url)
                                            router.get(url.pathname + url.search, {}, {
                                                preserveState: true,
                                                preserveScroll: true,
                                            })
                                        }
                                    }}
                                    dangerouslySetInnerHTML={{ __html: link.label }}
                                />
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </AppLayout>
    )
}


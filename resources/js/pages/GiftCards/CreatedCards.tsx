"use client"

import { Head, usePage, router } from "@inertiajs/react"
import { useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
    Gift,
    Calendar,
    DollarSign,
    Eye,
    User,
    Building2
} from "lucide-react"
import AppSidebarLayout from "@/layouts/app/app-sidebar-layout"
import { format } from "date-fns"
import toast from "react-hot-toast"

interface GiftCard {
    id: number
    voucher: string | null
    amount: number
    commission_percentage?: number | null
    total_commission?: number | null
    platform_commission?: number | null
    nonprofit_commission?: number | null
    brand: string | null
    brand_name: string | null
    currency: string
    status: string
    created_at: string
    purchased_at: string | null
    user?: {
        id: number
        name: string
        email: string
    }
    organization?: {
        id: number
        name: string
    }
}

interface CreatedCardsProps {
    giftCards: {
        data: GiftCard[]
        current_page: number
        last_page: number
        per_page: number
        total: number
    }
    organization: {
        id: number
        name: string
    } | null
    isAdmin?: boolean
}

export default function CreatedCardsPage({ giftCards, organization, isAdmin = false }: CreatedCardsProps) {
    const page = usePage()
    const flash = (page.props as any).flash || {}

    // Show success message if redirected from successful creation
    useEffect(() => {
        if (flash.success) {
            toast.success(flash.success)
        }
        if (flash.error) {
            toast.error(flash.error)
        }
    }, [flash.success, flash.error])

    const formatCurrency = (amount: number, currency: string = 'USD') => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency,
        }).format(amount)
    }

    // Format commission with more decimal places for very small values
    const formatCommission = (amount: number | null | undefined, currency: string = 'USD') => {
        if (amount === null || amount === undefined) return 'N/A'

        // For very small amounts (< 0.01), show more decimal places
        if (amount > 0 && amount < 0.01) {
            return new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: currency,
                minimumFractionDigits: 4,
                maximumFractionDigits: 8,
            }).format(amount)
        }

        // For normal amounts, use standard currency formatting
        return formatCurrency(amount, currency)
    }

    const getStatusBadge = (status: string) => {
        const statusConfig = {
            active: { color: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200', label: 'Active' },
            inactive: { color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300', label: 'Inactive' },
            pending: { color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200', label: 'Pending' },
            used: { color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300', label: 'Used' },
            expired: { color: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200', label: 'Expired' },
            failed: { color: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200', label: 'Failed' },
        }

        const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending

        return (
            <Badge className={config.color}>
                {config.label}
            </Badge>
        )
    }

    // Removed delete and toggle functions since all cards here are purchased

    return (
        <AppSidebarLayout>
            <Head title="Purchased Gift Cards" />

            <div className="flex h-full flex-1 flex-col gap-6 rounded-xl py-4 px-4 md:py-6 md:px-10">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold flex items-center gap-2">
                            <Gift className="h-8 w-8" />
                            Purchased Gift Cards
                        </h1>
                        <p className="text-muted-foreground mt-1">
                            {isAdmin
                                ? 'All gift cards purchased for all organizations'
                                : organization
                                    ? `Gift cards purchased for ${organization.name}`
                                    : 'All gift cards purchased for organizations'}
                        </p>
                    </div>
                </div>

                {/* Stats */}
                <div className={`grid grid-cols-1 sm:grid-cols-${isAdmin ? '4' : '3'} gap-4`}>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Purchased</CardTitle>
                            <Gift className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{giftCards.total}</div>
                            <p className="text-xs text-muted-foreground mt-1">
                                Gift cards purchased
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {formatCurrency(
                                    giftCards.data.length > 0
                                        ? giftCards.data.reduce((sum, card) => {
                                              const amount = typeof card.amount === 'number' ? card.amount : parseFloat(card.amount) || 0;
                                              return sum + amount;
                                          }, 0)
                                        : 0,
                                    giftCards.data[0]?.currency || 'USD'
                                )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                                Combined value
                            </p>
                        </CardContent>
                    </Card>

                    {isAdmin ? (
                        <Card className="border-l-4 border-l-blue-500">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Platform Commission</CardTitle>
                                <DollarSign className="h-4 w-4 text-blue-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                                    {formatCommission(
                                        giftCards.data.length > 0
                                            ? giftCards.data.reduce((sum, card) => {
                                                  const commission = typeof card.platform_commission === 'number' ? card.platform_commission : parseFloat(card.platform_commission) || 0;
                                                  return sum + commission;
                                              }, 0)
                                            : 0,
                                        giftCards.data[0]?.currency || 'USD'
                                    )}
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Total platform earnings
                                </p>
                            </CardContent>
                        </Card>
                    ) : (
                        <Card className="border-l-4 border-l-green-500">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Your Commission</CardTitle>
                                <DollarSign className="h-4 w-4 text-green-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                                    {formatCommission(
                                        giftCards.data.length > 0
                                            ? giftCards.data.reduce((sum, card) => {
                                                  const commission = typeof card.nonprofit_commission === 'number' ? card.nonprofit_commission : parseFloat(card.nonprofit_commission) || 0;
                                                  return sum + commission;
                                              }, 0)
                                            : 0,
                                        giftCards.data[0]?.currency || 'USD'
                                    )}
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Total organization earnings
                                </p>
                            </CardContent>
                        </Card>
                    )}

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Active Cards</CardTitle>
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {giftCards.data.filter(c => c.status === 'active').length}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                                Currently active
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* Gift Cards List */}
                <Card>
                    <CardHeader>
                        <CardTitle>Purchased Gift Cards ({giftCards.total})</CardTitle>
                        <CardDescription>
                            {isAdmin
                                ? 'Complete list of all gift cards purchased for all organizations'
                                : 'Complete list of all gift cards purchased for your organization'}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {giftCards.data.length === 0 ? (
                            <div className="text-center py-12 text-muted-foreground">
                                <Gift className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                <p>No purchased gift cards yet</p>
                                <p className="text-sm mt-2">
                                    Gift cards purchased for your organization will appear here
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {giftCards.data.map((card) => (
                                    <div
                                        key={card.id}
                                        className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 border rounded-xl hover:shadow-md transition-all duration-300 bg-card"
                                    >
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-3 mb-2">
                                                <div className="flex-shrink-0">
                                                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                                        <Gift className="h-5 w-5 text-primary" />
                                                    </div>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-semibold text-base truncate">
                                                        {card.brand_name || card.brand || 'Gift Card'}
                                                    </p>
                                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                        {card.organization && (
                                                            <>
                                                                <Building2 className="h-3 w-3" />
                                                                <span>{card.organization.name}</span>
                                                            </>
                                                        )}
                                                        {card.user && (
                                                            <>
                                                                <User className="h-3 w-3 ml-2" />
                                                                <span>{card.user.name}</span>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            {card.voucher && (
                                                <p className="text-xs text-muted-foreground font-mono pl-13">
                                                    Voucher: {card.voucher}
                                                </p>
                                            )}
                                        </div>

                                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 flex-shrink-0">
                                            <div className="text-right">
                                                <p className="text-2xl font-bold text-primary">
                                                    {formatCurrency(card.amount, card.currency)}
                                                </p>
                                                {isAdmin && card.platform_commission !== null && card.platform_commission !== undefined && (
                                                    <p className="text-sm font-semibold text-blue-600 dark:text-blue-400 mt-1">
                                                        Platform: {formatCommission(card.platform_commission, card.currency)}
                                                    </p>
                                                )}
                                                {!isAdmin && card.nonprofit_commission !== null && card.nonprofit_commission !== undefined && (
                                                    <p className="text-sm font-semibold text-green-600 dark:text-green-400 mt-1">
                                                        Commission: {formatCommission(card.nonprofit_commission, card.currency)}
                                                    </p>
                                                )}
                                                {isAdmin && card.nonprofit_commission !== null && card.nonprofit_commission !== undefined && (
                                                    <p className="text-sm font-semibold text-green-600 dark:text-green-400 mt-1">
                                                        Nonprofit: {formatCommission(card.nonprofit_commission, card.currency)}
                                                    </p>
                                                )}
                                                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                                                    <Calendar className="h-3 w-3" />
                                                    {format(new Date(card.created_at), 'MMM dd, yyyy')}
                                                </p>
                                            </div>
                                            <div className="flex flex-col gap-2">
                                                {getStatusBadge(card.status)}
                                                {/* View button - all cards here are purchased */}
                                                <div className="flex gap-2 mt-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => router.visit(route('gift-cards.show.id', card.id))}
                                                        className="flex-1"
                                                    >
                                                        <Eye className="h-3 w-3 mr-1" />
                                                        View Details
                                                    </Button>
                                                </div>
                                                {card.purchased_at && (
                                                    <div className="text-xs text-muted-foreground mt-1">
                                                        Purchased on {format(new Date(card.purchased_at), 'MMM dd, yyyy')}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Pagination Info */}
                        {giftCards.total > giftCards.per_page && (
                            <div className="mt-6 text-center text-sm text-muted-foreground">
                                Showing {((giftCards.current_page - 1) * giftCards.per_page) + 1} to{' '}
                                {Math.min(giftCards.current_page * giftCards.per_page, giftCards.total)} of{' '}
                                {giftCards.total} gift cards
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

        </AppSidebarLayout>
    )
}

